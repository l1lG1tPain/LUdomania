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

// ==================== DOM-элементы ====================

// Авторизация
const loginBtn = document.getElementById("login");

// Профильный хедер
const profileAvatarEl = document.getElementById("profileAvatar");
const profileNameEl   = document.getElementById("profileName");
const profileIdEl     = document.getElementById("profileId");
const headerBalanceEl = document.getElementById("headerBalance");
const headerLevelEl   = document.getElementById("headerLevel");

// Статистика FARM
const balanceEl        = document.getElementById("balance");
const clickPowerEl     = document.getElementById("clickPower");
const totalClicksEl    = document.getElementById("totalClicks");
const playerLevelEl    = document.getElementById("playerLevel");
const levelProgressBar = document.getElementById("levelProgressBar");

// Игровые элементы
const bigClickArea = document.getElementById("bigClickArea");
const upgradeBtn   = document.getElementById("upgradeBtn");
const upgradeCostEl = document.getElementById("upgradeCost");

// Mini-games / Inventory
const machinesEl  = document.getElementById("machines");
const inventoryEl = document.getElementById("inventory");

// Навигация
const bottomNavItems = document.querySelectorAll(".bottom-nav .nav-item");
const pages          = document.querySelectorAll(".page");

// ==================== Состояние ====================

let uid            = null;
let userRef        = null;
let clickPower     = 1;
let balance        = 0;
let totalClicks    = 0;
let currentLevel   = 0;
let authInProgress = false;

const BOT_USERNAME = "LUdomania_app_bot";

// базовый URL для бэка (локалка / прод)
const API_BASE =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://ludomania.onrender.com";

// ==================== Утилиты ====================

// формат LM: 10000 → 10k, 1_200_000 → 1.2m
function formatLM(num) {
    if (num < 10000) return String(num);
    const units = [
        { v: 1e9, s: "b" },
        { v: 1e6, s: "m" },
        { v: 1e3, s: "k" },
    ];
    for (const u of units) {
        if (num >= u.v) {
            const base = num / u.v;
            let txt = base.toFixed(base < 10 ? 1 : 0) + u.s;
            if (txt.length > 5) txt = base.toFixed(0) + u.s;
            return txt;
        }
    }
    return String(num);
}

// расчёт уровня по общему числу кликов
// 0 → [0,500)
// 1 → +1000
// 2 → +1500 ...
function calcLevel(total) {
    let level = 0;
    let step = 500;
    let remaining = total;

    while (remaining >= step) {
        remaining -= step;
        level++;
        step += 500; // каждый следующий дороже на 500
    }

    const progressToNext = step === 0 ? 0 : remaining / step;

    return { level, progress: progressToNext };
}

// максимум силы клика для текущего уровня
// 3 апгрейда на уровень → maxPower = 1 + (level+1)*3
function getMaxClickPower(level) {
    return 1 + (level + 1) * 3;
}

// красивый тост
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2100);
}

// модалка выигрыша
function showPrizeModal(prize) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "modal";

    modal.innerHTML = `
    <div class="modal-title">Выигрыш!</div>
    <div class="modal-body">
      <div style="font-size:48px;">${prize.emoji}</div>
      <div style="margin-top:8px;font-weight:600;">${prize.name}</div>
      <div style="margin-top:4px;font-size:13px;opacity:0.7;">Стоимость: ${prize.value} LM</div>
    </div>
    <button class="btn primary" id="modalPrizeOk">Дальше играть</button>
  `;

    backdrop.addEventListener("click", () => {
        backdrop.remove();
        modal.remove();
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    const okBtn = document.getElementById("modalPrizeOk");
    if (okBtn) {
        okBtn.addEventListener("click", () => {
            backdrop.remove();
            modal.remove();
        });
    }
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

    const photoUrl = data.photoUrl;
    profileAvatarEl.innerHTML = "";

    if (photoUrl) {
        const img = document.createElement("img");
        img.src = photoUrl;
        img.alt = name;
        profileAvatarEl.appendChild(img);
    } else {
        profileAvatarEl.textContent = "🦈";
    }
}

// ==================== Навигация между страницами ====================

function setActivePage(targetId) {
    pages.forEach((p) => {
        if (p.id === targetId) p.classList.add("active");
        else p.classList.remove("active");
    });

    bottomNavItems.forEach((item) => {
        if (item.dataset.target === targetId) item.classList.add("active");
        else item.classList.remove("active");
    });
}

bottomNavItems.forEach((item) => {
    item.addEventListener("click", () => {
        const target = item.dataset.target;
        if (!target) return;
        setActivePage(target);
    });
});

// ==================== Игровые утилиты ====================

function getUpgradeCost(power) {
    return Math.round(10 * Math.pow(power, 1.5));
}

function updateUpgradeUI() {
    const cost = getUpgradeCost(clickPower);
    if (upgradeCostEl) upgradeCostEl.textContent = cost;
    if (upgradeBtn)    upgradeBtn.disabled = balance < cost || !uid;
}

// ==================== Рендер автоматов ====================

function renderMachines() {
    if (!machinesEl) return;

    machinesEl.innerHTML = "";

    MACHINES.forEach((m) => {
        const div = document.createElement("div");
        div.className = "machine-card";

        div.innerHTML = `
      <div class="machine-name">${m.name}</div>
      <div class="machine-meta">${m.price} LM / попытка</div>
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

// ==================== Инвентарь ====================

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
        div.className = "inv-card";

        div.innerHTML = `
      <div class="inv-emoji">${item.emoji}</div>
      <div class="inv-name">${item.name}</div>
      <div class="inv-progress">
        ${rarityLabels[item.rarity] ?? item.rarity} • ${item.value} LM
      </div>
      <button class="btn secondary inv-sell" data-id="${item.id}">
        Продать
      </button>
    `;

        inventoryEl.appendChild(div);
    });

    inventoryEl.onclick = async (e) => {
        const btn = e.target.closest(".inv-sell");
        if (!btn) return;
        if (!uid) {
            showToast("Сначала авторизуйся через Telegram");
            return;
        }

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

// ==================== Подписка на документ пользователя ====================

function subscribeToUser(userUid) {
    userRef = doc(db, "users", userUid);

    onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        balance     = data.balance     ?? 0;
        clickPower  = data.clickPower  ?? 1;
        totalClicks = data.totalClicks ?? 0;

        const { level, progress } = calcLevel(totalClicks);
        currentLevel = level;

        if (balanceEl)     balanceEl.textContent     = formatLM(balance);
        if (clickPowerEl)  clickPowerEl.textContent  = clickPower;
        if (totalClicksEl) totalClicksEl.textContent = totalClicks;

        if (playerLevelEl) playerLevelEl.textContent = level;
        if (headerLevelEl) headerLevelEl.textContent = level;
        if (headerBalanceEl) headerBalanceEl.textContent = formatLM(balance);
        if (levelProgressBar) {
            levelProgressBar.style.width = `${Math.round(progress * 100)}%`;
        }

        updateUpgradeUI();
        renderProfileFromData(data);

        const onlineDot = document.getElementById("onlineDot");
        if (onlineDot) onlineDot.classList.remove("hidden");
    });
}

// ==================== Инициализация полей в БД ====================

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
            level:       0,
        });
    } else {
        const data = snap.data();
        const patch = {};
        if (data.balance      === undefined) patch.balance      = 0;
        if (data.clickPower   === undefined) patch.clickPower   = 1;
        if (data.totalClicks  === undefined) patch.totalClicks  = 0;
        if (data.totalEarned  === undefined) patch.totalEarned  = 0;
        if (data.totalSpent   === undefined) patch.totalSpent   = 0;
        if (data.level        === undefined) patch.level        = 0;

        if (Object.keys(patch).length > 0) {
            await updateDoc(ref, patch);
        }
    }
}

// ==================== Кликер ====================

async function handleClick() {
    if (!uid || !userRef) {
        showToast("Сначала авторизуйся через Telegram");
        return;
    }

    if (bigClickArea) bigClickArea.style.pointerEvents = "none";

    try {
        await updateDoc(userRef, {
            balance:     increment(clickPower),
            totalClicks: increment(1),
            totalEarned: increment(clickPower),
        });
    } catch (e) {
        console.error("click error", e);
    } finally {
        if (bigClickArea) bigClickArea.style.pointerEvents = "auto";
    }
}

// апгрейд с лимитом по уровню
async function handleUpgrade() {
    if (!uid || !userRef) {
        showToast("Сначала авторизуйся через Telegram");
        return;
    }

    const maxPower = getMaxClickPower(currentLevel);
    if (clickPower >= maxPower) {
        showToast(`Лимит силы клика на уровне ${currentLevel}. Накликай до следующего уровня!`);
        return;
    }

    const cost = getUpgradeCost(clickPower);
    if (balance < cost) {
        showToast("Недостаточно ЛудоМани для апгрейда 💸");
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

// ==================== Автоматы ====================

async function playMachine(machineId) {
    if (!uid || !userRef) {
        showToast("Сначала авторизуйся через Telegram");
        return;
    }

    const machine = MACHINES.find((m) => m.id === machineId);
    if (!machine) return;

    if (balance < machine.price) {
        showToast("Не хватает ЛудоМани для этого автомата 🪙");
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
        showToast("Игрушка выскользнула из лапы 😢");
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

        showPrizeModal(prizeTemplate);
    } catch (e) {
        console.error("add prize error", e);
    }
}

// ==================== Продажа предмета ====================

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

// ==================== Общий пост-логин ====================

async function afterFirebaseLogin(userUid, tgUser) {
    uid = userUid;

    await ensureGameFields(uid, tgUser || null);

    if (loginBtn) loginBtn.classList.add("hidden");

    userRef = doc(db, "users", uid);
    subscribeToUser(uid);
    subscribeToInventory(uid);
    renderMachines();
}

// ==================== Браузерный флоу (код) ====================

async function pollBrowserAuth(code) {
    return new Promise((resolve, reject) => {
        let tries = 0;
        const maxTries = 60;

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

    showToast("Открылся Telegram, нажми Start в боте…");

    await pollBrowserAuth(code);

    showToast("Авторизация выполнена ✔️");
}

// ==================== MiniApp флоу ====================

async function loginInsideMiniApp() {
    try {
        if (loginBtn) loginBtn.disabled = true;

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

// ==================== Общая кнопка логина ====================

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

// ==================== Лиснеры ====================

if (loginBtn)      loginBtn.addEventListener("click", loginWithTelegram);
if (bigClickArea)  bigClickArea.addEventListener("click", handleClick);
if (upgradeBtn)    upgradeBtn.addEventListener("click", handleUpgrade);

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

// при загрузке рендерим автоматы (для гостя тоже)
renderMachines();
