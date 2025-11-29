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
    deleteDoc,
} from "firebase/firestore";
import {
    MACHINES,
    PRIZES,
    COLLECTIONS,
    RARITY_META,
    calculateLevelState,
    randomFrom,
} from "./gameConfig.js";

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
const multiplierEl     = document.getElementById("multiplier");

// Игровые элементы
const bigClickArea  = document.getElementById("bigClickArea");
const upgradeBtn    = document.getElementById("upgradeBtn");
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

let clickMultiplier = 1; // множитель от коллекций

// статистика автоматов
const globalMachineStats = {}; // { [machineId]: { totalSpins } }
let   userMachineStats   = {}; // { [machineId]: { spins } }

const BOT_USERNAME = "LUdomania_app_bot";

const API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://ludomania.onrender.com";

// ==================== Утилиты ====================

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

function getMaxClickPower(level) {
    return 1 + (level + 1) * 3;
}

// 🔔 тостер (широкий, сверху)
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
}

function isTelegramWebApp() {
    if (!window.Telegram || !window.Telegram.WebApp) return false;
    const initData = window.Telegram.WebApp.initData;
    return typeof initData === "string" && initData.length > 0;
}

// ==================== Клик-баблы (+N) ====================

function spawnClickBubble(x, y, gain) {
    const bubble = document.createElement("div");
    bubble.className = "click-bubble";
    bubble.textContent = `+${gain}`;

    bubble.style.left = `${x}px`;
    bubble.style.top  = `${y}px`;

    document.body.appendChild(bubble);

    bubble.addEventListener("animationend", () => {
        bubble.remove();
    });
}

// ==================== Профиль ====================

function renderProfileFromData(data) {
    if (!profileNameEl || !profileIdEl || !profileAvatarEl) return;

    const name = data.firstName || data.username || "Игрок";
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

// ==================== Навигация ====================

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

// ⚙️ только отрисовка статы, без смены currentLevel
function renderStatsFromState(levelStateOverride) {
    const ls = levelStateOverride || calculateLevelState(totalClicks);

    if (balanceEl)        balanceEl.textContent        = formatLM(balance);
    if (clickPowerEl)     clickPowerEl.textContent     = clickPower;
    if (totalClicksEl)    totalClicksEl.textContent    = totalClicks;
    if (playerLevelEl)    playerLevelEl.textContent    = ls.level;
    if (headerLevelEl)    headerLevelEl.textContent    = ls.level;
    if (headerBalanceEl)  headerBalanceEl.textContent  = formatLM(balance);
    if (levelProgressBar) levelProgressBar.style.width = `${Math.round((ls.progress || 0) * 100)}%`;

    if (multiplierEl) {
        multiplierEl.textContent = `x${clickMultiplier.toFixed(
            clickMultiplier % 1 === 0 ? 0 : 1
        )}`;
    }

    updateUpgradeUI();
}

// ==================== Левел-ап ====================

function onLevelChange(oldLevel, newLevel, levelState) {
    if (newLevel <= oldLevel) {
        currentLevel = newLevel;
        return;
    }

    currentLevel = newLevel;

    const newlyUnlocked = MACHINES.filter((m) => {
        const min = m.minLevel ?? 0;
        return min > oldLevel && min <= newLevel;
    });

    let msg = `🎉 Новый уровень ${newLevel}!`;
    if (newlyUnlocked.length) {
        const names = newlyUnlocked.map((m) => m.name).join(", ");
        msg += ` Доступны автоматы: ${names}`;
    }

    showToast(msg);
    renderMachines();

    if (newlyUnlocked.length) {
        setActivePage("pageMiniGames");
    }
}

// ==================== Статистика автоматов ====================

let globalStatsSubscribed = false;

function subscribeGlobalMachineStats() {
    if (globalStatsSubscribed) return;
    globalStatsSubscribed = true;

    const statsCol = collection(db, "machine_stats");
    onSnapshot(statsCol, (snap) => {
        snap.docChanges().forEach((change) => {
            const docId = change.doc.id;
            if (change.type === "removed") {
                delete globalMachineStats[docId];
            } else {
                globalMachineStats[docId] = change.doc.data();
            }
        });
        renderMachines();
    });
}

function subscribeUserMachineStats(userUid) {
    const colRef = collection(db, "users", userUid, "machineStats");
    onSnapshot(colRef, (snap) => {
        const map = {};
        snap.forEach((d) => {
            map[d.id] = d.data();
        });
        userMachineStats = map;
        renderMachines();
    });
}

// ==================== Коллекции и бонусы ====================

function recomputeCollectionsAndBonuses(items) {
    let newClickMultiplier = 1;

    const itemByPrizeId = new Map();
    items.forEach((it) => {
        const prizeId = it.prizeId || it.id;
        itemByPrizeId.set(prizeId, it);
    });

    Object.values(COLLECTIONS).forEach((collection) => {
        const required = collection.requiredPrizeIds || [];
        const hasAll = required.every((prizeId) => {
            const item = itemByPrizeId.get(prizeId);
            return item && (item.count ?? 0) > 0;
        });

        if (!hasAll) return;

        const bonus = collection.bonus;
        if (!bonus) return;

        if (bonus.type === "clickMultiplier") {
            const value = bonus.value ?? 1;
            newClickMultiplier *= value;
        }
        // остальные типы бонусов пока не трогаем
    });

    clickMultiplier = newClickMultiplier;
}

// ==================== Инвентарь (СТАКИ) ====================

function renderInventory(items) {
    if (!inventoryEl) return;

    inventoryEl.innerHTML = "";

    if (items.length === 0) {
        inventoryEl.textContent = "Пока пусто. Выбей что-нибудь из автомата 🎰";
        clickMultiplier = 1;
        renderStatsFromState();
        return;
    }

    recomputeCollectionsAndBonuses(items);
    renderStatsFromState();

    items.forEach((item) => {
        const div = document.createElement("div");
        div.className = "inv-card";

        const prizeId = item.prizeId || item.id;
        const cfg = PRIZES[prizeId] || {};

        const rarityKey = item.rarity || cfg.rarity || "common";
        const rarityMeta = RARITY_META[rarityKey] || {
            label: rarityKey,
            color: "#888",
        };

        const count     = item.count ?? 1;
        const maxGlobal = item.maxCopiesGlobal ?? cfg.maxCopiesGlobal ?? 0;
        let   percent   = 0;

        if (maxGlobal > 0) {
            percent = Math.min(100, Math.round((count / maxGlobal) * 100));
        }

        const value = (item.value ?? cfg.value) || 0;

        div.innerHTML = `
      <div class="inv-emoji">${item.emoji || cfg.emoji || "🎁"}</div>
      <div class="inv-name">${item.name || cfg.name || "Неизвестный приз"}</div>
      <div class="inv-progress">
        <div style="color:${rarityMeta.color}">
          ${rarityMeta.label} • ${value} LM
        </div>
        <div class="inv-progress-bar">
          <div class="inv-progress-fill" style="width:${percent}%"></div>
        </div>
        <div class="inv-progress-text">
          ${count} / ${maxGlobal || "∞"}
        </div>
      </div>
      <button class="btn secondary inv-sell" data-id="${item.id}">
        Продать 1
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

        const prizeId = item.prizeId || item.id;
        const cfg     = PRIZES[prizeId] || {};
        const value   = (item.value ?? cfg.value) || 0;

        const confirmSell = confirm(
            `Продать 1 шт "${item.name}" за ${value} ЛудоМани?`
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

// ==================== Подписка на пользователя ====================

function subscribeToUser(userUid) {
    userRef = doc(db, "users", userUid);

    onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        balance     = data.balance     ?? 0;
        clickPower  = data.clickPower  ?? 1;
        totalClicks = data.totalClicks ?? 0;

        const storedLevel = data.level ?? 0;
        const levelState  = calculateLevelState(totalClicks);

        // Левелап только когда реальный уровень > сохранённого
        if (levelState.level > storedLevel) {
            onLevelChange(storedLevel, levelState.level, levelState);
            // один раз записываем новый уровень
            updateDoc(userRef, { level: levelState.level }).catch((e) =>
                console.error("update level error", e)
            );
            currentLevel = levelState.level;
        } else {
            currentLevel = storedLevel;
        }

        renderStatsFromState(levelState);
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
        const data  = snap.data();
        const patch = {};
        if (data.balance     === undefined) patch.balance     = 0;
        if (data.clickPower  === undefined) patch.clickPower  = 1;
        if (data.totalClicks === undefined) patch.totalClicks = 0;
        if (data.totalEarned === undefined) patch.totalEarned = 0;
        if (data.totalSpent  === undefined) patch.totalSpent  = 0;
        if (data.level       === undefined) patch.level       = 0;

        if (Object.keys(patch).length > 0) {
            await updateDoc(ref, patch);
        }
    }
}

// ==================== Кликер (мультитач + +N) ====================

async function handleClick() {
    if (!uid || !userRef) {
        showToast("Сначала авторизуйся через Telegram");
        return;
    }

    const gain = clickPower * clickMultiplier;

    // моментальный отклик
    balance     += gain;
    totalClicks += 1;
    renderStatsFromState();

    if (bigClickArea) {
        bigClickArea.classList.add("pulsing");
        setTimeout(() => bigClickArea.classList.remove("pulsing"), 80);
    }

    updateDoc(userRef, {
        balance:     increment(gain),
        totalClicks: increment(1),
        totalEarned: increment(gain),
    }).catch((e) => {
        console.error("click error", e);
    });
}

// ==================== Апгрейд ====================

async function handleUpgrade() {
    if (!uid || !userRef) {
        showToast("Сначала авторизуйся через Telegram");
        return;
    }

    const maxPower = getMaxClickPower(currentLevel);
    if (clickPower >= maxPower) {
        showToast(
            `Лимит силы клика на уровне ${currentLevel}. Накликай до следующего уровня!`
        );
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

function renderMachines() {
    if (!machinesEl) return;

    machinesEl.innerHTML = "";

    MACHINES.forEach((m) => {
        const div = document.createElement("div");
        div.className = "machine-card";

        const locked = currentLevel < (m.minLevel ?? 0);

        const globalStat = globalMachineStats[m.id] || {};
        const userStat   = userMachineStats[m.id]   || {};

        const totalSpins = globalStat.totalSpins || 0;
        const userSpins  = userStat.spins       || 0;

        div.innerHTML = `
      <div class="machine-name">${m.name}</div>
      <div class="machine-meta">${m.price} LM / попытка</div>
      <div class="machine-meta">Шанс: ${(m.winChance * 100).toFixed(0)}%</div>
      <div class="machine-meta">${m.description}</div>
      <div class="machine-meta">
        Всего игр: ${totalSpins}${uid ? ` • Твоих: ${userSpins}` : ""}
      </div>
      ${
            locked
                ? `<div class="machine-meta" style="color:#ffb74d;">Доступно с уровня ${m.minLevel}</div>`
                : `<button class="btn secondary machine-play" data-id="${m.id}">
                   Крутить
                 </button>`
        }
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

    // 1) списываем цену
    try {
        await updateDoc(userRef, {
            balance:    increment(-machine.price),
            totalSpent: increment(machine.price),
        });
    } catch (e) {
        console.error("play: balance update error", e);
        return;
    }

    // 2) рассчитываем победу
    const roll = Math.random();
    const win  = roll < machine.winChance;

    // 3) глобальная статистика автомата: /machine_stats/{machineId}
    try {
        const globalRef = doc(db, "machine_stats", machineId);
        await setDoc(
            globalRef,
            {
                totalSpins: increment(1),
                totalWins:  increment(win ? 1 : 0),
                updatedAt:  serverTimestamp(),
            },
            { merge: true }
        );
    } catch (e) {
        console.error("machine stats error", e);
    }

    // 4) персональная статистика юзера по автомату:
    // users/{uid}/machineStats/{machineId}
    try {
        const userMachineRef = doc(
            db,
            "users",
            uid,
            "machineStats",
            machineId
        );
        await setDoc(
            userMachineRef,
            {
                spins:      increment(1),
                wins:       increment(win ? 1 : 0),
                lastPlayed: serverTimestamp(),
            },
            { merge: true }
        );
    } catch (e) {
        console.error("user machine stats error", e);
    }

    // 5) если не выиграл — просто тостер и выходим
    if (!win) {
        showToast("Игрушка выскользнула из лапы 😢");
        return;
    }

    // 6) выбираем приз
    const prizeId       = randomFrom(machine.prizePool);
    const prizeTemplate = PRIZES[prizeId];

    if (!prizeTemplate) {
        console.error("Unknown prizeId", prizeId);
        return;
    }

    // 7) ⚙️ СТЕКИРУЕМ приз в инвентаре:
    // один документ на prizeId, поле count увеличиваем
    const invDocRef = doc(db, "users", uid, "inventory", prizeTemplate.id);

    try {
        await setDoc(
            invDocRef,
            {
                prizeId:        prizeTemplate.id,
                name:           prizeTemplate.name,
                emoji:          prizeTemplate.emoji,
                rarity:         prizeTemplate.rarity,
                value:          prizeTemplate.value,
                collectionId:   prizeTemplate.collectionId || null,
                maxCopiesGlobal: prizeTemplate.maxCopiesGlobal ?? null,
                count:          increment(1),
                firstWonAt:     serverTimestamp(),
                lastWonAt:      serverTimestamp(),
            },
            { merge: true }
        );

        // красивый тостер вместо модалки
        showToast(`Выигрыш: ${prizeTemplate.emoji} ${prizeTemplate.name}!`);
    } catch (e) {
        console.error("add prize error", e);
    }
}

// ==================== Продажа предмета ====================

async function sellItem(item) {
    if (!userRef || !uid) return;

    const invDocRef = doc(db, "users", uid, "inventory", item.id);
    const count     = item.count ?? 1;
    const prizeId   = item.prizeId || item.id;
    const cfg       = PRIZES[prizeId] || {};
    const baseValue = item.value ?? cfg.value ?? 0;

    try {
        if (count <= 1) {
            await deleteDoc(invDocRef);
        } else {
            await updateDoc(invDocRef, {
                count: increment(-1),
            });
        }

        await updateDoc(userRef, {
            balance:     increment(baseValue),
            totalEarned: increment(baseValue),
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
    subscribeUserMachineStats(uid);
    renderMachines();
}

// ==================== Браузерный флоу ====================

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

if (loginBtn)   loginBtn.addEventListener("click", loginWithTelegram);
if (upgradeBtn) upgradeBtn.addEventListener("click", handleUpgrade);

// клики с мультитачем и +N
if (bigClickArea) {
    bigClickArea.addEventListener("click", (e) => {
        const gain = clickPower * clickMultiplier;
        spawnClickBubble(e.clientX, e.clientY, gain);
        handleClick();
    });

    bigClickArea.addEventListener(
        "touchstart",
        (e) => {
            e.preventDefault();
            const touches = Array.from(e.changedTouches);
            const gain = clickPower * clickMultiplier;

            touches.forEach((t) => {
                spawnClickBubble(t.clientX, t.clientY, gain);
                handleClick();
            });
        },
        { passive: false }
    );
}

// ==================== onAuthStateChanged ====================

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    if (uid === user.uid && userRef) return;

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    await afterFirebaseLogin(user.uid, tgUser || null);
});

// ==================== Стартовые подписки ====================

subscribeGlobalMachineStats();

if (isTelegramWebApp()) {
    loginInsideMiniApp().catch((e) =>
        console.error("auto miniapp login error", e)
    );
}

renderMachines();
