// frontend/src/main.js
import { auth, db } from "./firebase.js";
import { signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    increment,
    serverTimestamp,
    collection,
    addDoc,
    deleteDoc,
} from "firebase/firestore";
import { MACHINES, PRIZES, randomFrom } from "./gameConfig.js";

// ==================== КОНСТАНТЫ ====================
const loginBtn      = document.getElementById("login");
const statusEl      = document.getElementById("status");
const gameEl        = document.getElementById("game");
const balanceEl     = document.getElementById("balance");
const clickPowerEl  = document.getElementById("clickPower");
const totalClicksEl = document.getElementById("totalClicks");
const clickBtn      = document.getElementById("clickBtn");
const upgradeBtn    = document.getElementById("upgradeBtn");
const upgradeCostEl = document.getElementById("upgradeCost");
const machinesEl    = document.getElementById("machines");
const inventoryEl   = document.getElementById("inventory");

// 🔹 новый профильный хедер
const profileAvatarEl = document.getElementById("profileAvatar");
const profileNameEl   = document.getElementById("profileName");
const profileIdEl     = document.getElementById("profileId");

let userRef    = null;
let uid        = null;
let clickPower = 1;
let balance    = 0;
let authInProgress = false;

const BOT_USERNAME = "LUdomania_app_bot";

// базовый URL для бэка (локалка / прод)
const API_BASE =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://ludomania.onrender.com";

// ==================== УТИЛИТЫ ====================
function getUpgradeCost(power) {
    return Math.round(10 * Math.pow(power, 1.5));
}

function updateUpgradeUI() {
    const cost = getUpgradeCost(clickPower);
    if (upgradeCostEl) upgradeCostEl.textContent = cost;
    if (upgradeBtn)    upgradeBtn.disabled = balance < cost;
}

function isTelegramWebApp() {
    if (!window.Telegram || !window.Telegram.WebApp) return false;
    const initData = window.Telegram.WebApp.initData;
    return typeof initData === "string" && initData.length > 0;
}

// аккуратно рендерим профиль
function renderProfileFromData(data) {
    if (!profileNameEl || !profileIdEl || !profileAvatarEl) return;

    const name =
        data.firstName ||
        data.username ||
        "Игрок";

    const akulkaId = data.akulkaId || "—";

    profileNameEl.textContent = name;
    profileIdEl.textContent   = `AkulkaID: ${akulkaId}`;

    // аватар: если есть фото — рисуем картинку, иначе эмоджи
    const photoUrl = data.photoUrl;
    profileAvatarEl.innerHTML = "";
    profileAvatarEl.style.backgroundImage = "";
    profileAvatarEl.style.backgroundSize  = "";
    profileAvatarEl.style.backgroundPosition = "";

    if (photoUrl) {
        const img = document.createElement("img");
        img.src = photoUrl;
        img.alt = name;
        profileAvatarEl.appendChild(img);
    } else {
        profileAvatarEl.textContent = "🦈";
    }
}

// ==================== РЕНДЕР АВТОМАТОВ ====================
function renderMachines() {
    if (!machinesEl) return;

    machinesEl.innerHTML = "";

    MACHINES.forEach((m) => {
        const div = document.createElement("div");
        div.className = "machine-card";

        div.innerHTML = `
      <div class="machine-header">
        <span class="machine-name">${m.name}</span>
        <span class="machine-meta">${m.price} LM / попытка</span>
      </div>
      <div class="machine-meta">Шанс: ${(m.winChance * 100).toFixed(0)}%</div>
      <div class="machine-meta">${m.description}</div>
      <button class="btn secondary machine-play" data-id="${m.id}">
        Крутить
      </button>
    `;

        machinesEl.appendChild(div);
    });

    machinesEl.onclick = (e) => {
        const btn = e.target.closest(".machine-play");
        if (!btn) return;
        const id = btn.dataset.id;
        playMachine(id);
    };
}

// ==================== ИНВЕНТАРЬ ====================
function renderInventory(items) {
    if (!inventoryEl) return;

    inventoryEl.innerHTML = "";

    if (items.length === 0) {
        inventoryEl.textContent = "Пока пусто. Выбей что-нибудь из автомата 🎰";
        return;
    }

    const rarityLabels = {
        common: "Обычный",
        rare: "Редкий",
        epic: "Эпический",
        legendary: "Легендарный",
    };

    items.forEach((item) => {
        const div = document.createElement("div");
        div.className = "inv-item";

        div.innerHTML = `
      <div class="inv-main">
        <span class="inv-emoji">${item.emoji}</span>
        <div>
          <div class="inv-name">${item.name}</div>
          <div class="inv-rarity">
            ${rarityLabels[item.rarity] ?? item.rarity} • ${item.value} LM
          </div>
        </div>
      </div>
      <div class="inv-actions">
        <button class="btn primary inv-sell" data-id="${item.id}">
          Продать
        </button>
      </div>
    `;

        inventoryEl.appendChild(div);
    });

    inventoryEl.onclick = async (e) => {
        const btn = e.target.closest(".inv-sell");
        if (!btn) return;

        const itemId = btn.dataset.id;
        const item   = items.find((it) => it.id === itemId);
        if (!item) return;

        const confirmSell = confirm(
            `Продать "${item.name}" за ${item.value} ЛудоМани?`
        );
        if (!confirmSell) return;

        await sellItem(item);
    };
}

function subscribeToInventory(userUid) {
    const invCol = collection(db, "users", userUid, "inventory");

    onSnapshot(invCol, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderInventory(items);
    });
}

// ==================== ПОДПИСКА НА ЮЗЕРА ====================
function subscribeToUser(userUid) {
    userRef = doc(db, "users", userUid);

    onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        balance    = data.balance     ?? 0;
        clickPower = data.clickPower  ?? 1;
        const totalClicks = data.totalClicks ?? 0;

        if (balanceEl)     balanceEl.textContent     = balance;
        if (clickPowerEl)  clickPowerEl.textContent  = clickPower;
        if (totalClicksEl) totalClicksEl.textContent = totalClicks;

        updateUpgradeUI();
        renderProfileFromData(data);
    });
}

// ==================== ГАРАНТИЯ ПОЛЕЙ В БД ====================
async function ensureGameFields(userUid, telegramInfo) {
    const ref  = doc(db, "users", userUid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, {
            telegram_id: telegramInfo?.id ?? null,
            username:    telegramInfo?.username ?? null,
            firstName:   telegramInfo?.first_name ?? "",
            photoUrl:    telegramInfo?.photo_url ?? null,
            createdAt:   serverTimestamp(),
            lastLogin:   serverTimestamp(),
            balance:     0,
            clickPower:  1,
            totalClicks: 0,
            totalEarned: 0,
            totalSpent:  0,
        });
    } else {
        const data = snap.data();
        const patch = {};
        if (data.balance      === undefined) patch.balance      = 0;
        if (data.clickPower   === undefined) patch.clickPower   = 1;
        if (data.totalClicks  === undefined) patch.totalClicks  = 0;
        if (data.totalEarned  === undefined) patch.totalEarned  = 0;
        if (data.totalSpent   === undefined) patch.totalSpent   = 0;

        if (Object.keys(patch).length > 0) {
            await updateDoc(ref, patch);
        }
    }
}

// ==================== КЛИКЕР ====================
async function handleClick() {
    if (!userRef) return;
    if (clickBtn) clickBtn.disabled = true;
    try {
        await updateDoc(userRef, {
            balance:     increment(clickPower),
            totalClicks: increment(1),
            totalEarned: increment(clickPower),
        });
    } catch (e) {
        console.error("click error", e);
    } finally {
        if (clickBtn) clickBtn.disabled = false;
    }
}

async function handleUpgrade() {
    if (!userRef) return;

    const cost = getUpgradeCost(clickPower);
    if (balance < cost) {
        alert("Недостаточно ЛудоМани для апгрейда 💸");
        return;
    }

    if (upgradeBtn) upgradeBtn.disabled = true;

    try {
        await updateDoc(userRef, {
            balance:    increment(-cost),
            clickPower: increment(1),
            totalSpent: increment(cost),
        });
    } catch (e) {
        console.error("upgrade error", e);
    } finally {
        if (upgradeBtn) upgradeBtn.disabled = false;
    }
}

// ==================== АВТОМАТЫ ====================
async function playMachine(machineId) {
    if (!userRef) return;

    const machine = MACHINES.find((m) => m.id === machineId);
    if (!machine) return;

    if (balance < machine.price) {
        alert("Не хватает ЛудоМани для этого автомата 🪙");
        return;
    }

    try {
        await updateDoc(userRef, {
            balance:    increment(-machine.price),
            totalSpent: increment(machine.price),
        });
    } catch (e) {
        console.error("play: balance update error", e);
        return;
    }

    const roll = Math.random();
    const win  = roll < machine.winChance;

    if (!win) {
        alert("Не повезло, игрушка выскользнула из лапы 😢");
        return;
    }

    const prizeId       = randomFrom(machine.prizePool);
    const prizeTemplate = PRIZES[prizeId];

    if (!prizeTemplate) {
        console.error("Unknown prizeId", prizeId);
        return;
    }

    const invCol = collection(db, "users", uid, "inventory");

    try {
        await addDoc(invCol, {
            prizeId:   prizeTemplate.id,
            name:      prizeTemplate.name,
            emoji:     prizeTemplate.emoji,
            rarity:    prizeTemplate.rarity,
            value:     prizeTemplate.value,
            createdAt: serverTimestamp(),
        });

        alert(`Ты вытащил: ${prizeTemplate.emoji} ${prizeTemplate.name}!`);
    } catch (e) {
        console.error("add prize error", e);
    }
}

async function sellItem(item) {
    if (!userRef || !uid) return;

    const invDocRef = doc(db, "users", uid, "inventory", item.id);

    try {
        await deleteDoc(invDocRef);
        await updateDoc(userRef, {
            balance:     increment(item.value),
            totalEarned: increment(item.value),
        });
    } catch (e) {
        console.error("sell error", e);
    }
}

// ==================== ОБЩИЙ ПОСТ-ЛОГИН ====================
async function afterFirebaseLogin(userUid, tgUser) {
    uid = userUid;

    await ensureGameFields(uid, tgUser || null);

    // убираем текст статуса
    if (statusEl) statusEl.textContent = "";

    // показываем зелёный индикатор
    const onlineDot = document.getElementById("onlineDot");
    if (onlineDot) onlineDot.classList.remove("hidden");

    if (loginBtn) loginBtn.classList.add("hidden");
    if (gameEl) gameEl.classList.remove("hidden");

    userRef = doc(db, "users", uid);
    subscribeToUser(uid);
    subscribeToInventory(uid);
    renderMachines();
}

// ==================== БРАУЗЕРНЫЙ ФЛОУ (код) ====================
async function pollBrowserAuth(code) {
    return new Promise((resolve, reject) => {
        let tries = 0;
        const maxTries = 60; // 60 * 2с = 2 минуты

        const timer = setInterval(async () => {
            tries++;
            if (tries > maxTries) {
                clearInterval(timer);
                reject(new Error("timeout"));
                return;
            }

            try {
                const resp = await fetch(
                    `${API_BASE}/auth/browser/poll?code=${encodeURIComponent(code)}`
                );
                const data = await resp.json();

                if (data.status === "linked" && data.token) {
                    clearInterval(timer);

                    const cred = await signInWithCustomToken(auth, data.token);
                    await afterFirebaseLogin(cred.user.uid, null);

                    resolve();
                }
            } catch (e) {
                console.error("poll error", e);
            }
        }, 2000);
    });
}

async function loginInBrowserViaCode() {
    const resp = await fetch(`${API_BASE}/auth/browser/start`, {
        method: "POST",
    });

    if (!resp.ok) {
        throw new Error("Failed to start browser auth");
    }

    const { code } = await resp.json();
    if (!code) {
        throw new Error("No code from backend");
    }

    window.open(`https://t.me/${BOT_USERNAME}?start=${code}`, "_blank");

    if (statusEl) {
        statusEl.textContent = "Открылся Telegram, нажми Start в боте…";
    }

    await pollBrowserAuth(code);

    if (statusEl) {
        statusEl.textContent = "Авторизация выполнена ✔️";
    }
}

// ==================== MINIAPP ФЛОУ ====================
async function loginInsideMiniApp() {
    try {
        if (loginBtn) loginBtn.disabled = true;
        if (statusEl) statusEl.textContent = "Авторизация...";

        const tg       = window.Telegram.WebApp;
        const initData = tg.initData;
        const unsafe   = tg.initDataUnsafe;

        if (!initData) {
            alert("Telegram не передал initData");
            if (loginBtn) loginBtn.disabled = false;
            return;
        }

        const resp = await fetch(`${API_BASE}/auth/telegram`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
        });

        if (!resp.ok) {
            console.error("Auth error:", await resp.text());
            alert("Ошибка авторизации");
            if (loginBtn) loginBtn.disabled = false;
            return;
        }

        const { token } = await resp.json();

        const cred = await signInWithCustomToken(auth, token);
        await afterFirebaseLogin(cred.user.uid, unsafe?.user || null);

        window.Telegram.WebApp.ready();
    } catch (err) {
        console.error("Auth exception:", err);
        alert("Что-то пошло не так");
    } finally {
        if (loginBtn) loginBtn.disabled = false;
    }
}

// ==================== ОБЩАЯ КНОПКА ЛОГИНА ====================
async function loginWithTelegram() {
    if (authInProgress) return;
    authInProgress = true;

    try {
        if (isTelegramWebApp()) {
            await loginInsideMiniApp();
        } else {
            await loginInBrowserViaCode();
        }
    } catch (e) {
        console.error("loginWithTelegram error", e);
        alert("Не удалось выполнить авторизацию");
    } finally {
        authInProgress = false;
    }
}

// ==================== ЛИСНЕРЫ ====================
if (loginBtn)   loginBtn.addEventListener("click", loginWithTelegram);
if (clickBtn)   clickBtn.addEventListener("click", handleClick);
if (upgradeBtn) upgradeBtn.addEventListener("click", handleUpgrade);

// ==================== onAuthStateChanged ====================
onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    if (uid === user.uid && userRef) return;

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    await afterFirebaseLogin(user.uid, tgUser || null);
});

// автологин только внутри миниаппа
if (isTelegramWebApp()) {
    loginInsideMiniApp().catch((e) =>
        console.error("auto miniapp login error", e)
    );
}
