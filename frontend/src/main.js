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
    runTransaction,
    getDocs,
} from "firebase/firestore";

import {
    MACHINES,
    PRIZES,
    COLLECTIONS,
    RARITY_META,
    calculateLevelState,
    randomFrom,
} from "./gameConfig.js";

import {
    buildProfileViewModel,
    renderProfileFromUserDoc,
    updateProfileCollectionValue,
    updateProfileGameStats,
} from "./profileLogic.js";

import { getLeagueForLevel } from "./leagueLogic.js";

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
const levelHintEl      = document.getElementById("levelHint");

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

// overlay автомата
const machineOverlayEl      = document.getElementById("machineOverlay");
const machineCloseBtn       = document.getElementById("machineCloseBtn");
const machinePlayBtn        = document.getElementById("machinePlayBtn");
const machineTitleEl        = document.getElementById("machineTitle");
const machinePriceEl        = document.getElementById("machinePrice");
const machinePrizeStripEl   = document.getElementById("machinePrizeStrip");
const machineResultEl       = document.getElementById("machineResult");
const machineResultEmojiEl  = document.getElementById("machineResultEmoji");
const machineResultTextEl   = document.getElementById("machineResultText");
const machineStatsSummaryEl = document.getElementById("machineStatsSummary");

let currentMachineId   = null;
let machineSpinRunning = false;

// ==================== Состояние ====================

let uid            = null;
let userRef        = null;
let clickPower     = 1;
let balance        = 0;
let totalClicks    = 0;
let currentLevel   = 0;
let authInProgress = false;

let clickMultiplier       = 1; // множитель от коллекций
let totalCollectionValue  = 0; // общая стоимость коллекции (включая все копии)

// кэш последнего инвентаря (для sellItem по кнопке)
let lastInventoryItems = [];

// статистика автоматов
let globalMachineStats = {}; // { machineId: { totalSpins, totalWins } }
let userMachineStats   = {}; // { machineId: { spins, wins } }

const BOT_USERNAME = "LUdomania_app_bot";

const API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://ludomania.onrender.com";

// ==================== Утилиты ====================

function recomputeAggregateMachineStats() {
    let myGames     = 0;
    let myWins      = 0;
    let globalGames = 0;
    let globalWins  = 0;

    Object.values(userMachineStats).forEach((s) => {
        myGames += s.spins || 0;
        myWins  += s.wins  || 0;
    });

    Object.values(globalMachineStats).forEach((s) => {
        globalGames += s.totalSpins || 0;
        globalWins  += s.totalWins  || 0;
    });

    const myWinrate     = myGames > 0 ? (myWins / myGames) * 100 : 0;
    const globalWinrate = globalGames > 0 ? (globalWins / globalGames) * 100 : 0;

    updateProfileGameStats({
        myGames,
        myWins,
        myWinrate,
        globalGames,
        globalWins,
        globalWinrate,
    });
}

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

// кнопки внизу
bottomNavItems.forEach((item) => {
    item.addEventListener("click", () => {
        const target = item.dataset.target;
        if (!target) return;
        setActivePage(target);
    });
});

// Открываем страницу профиля по клику на шапку
function openProfilePage() {
    setActivePage("pageProfile");
}

if (profileAvatarEl) {
    profileAvatarEl.addEventListener("click", openProfilePage);
}
if (profileNameEl) {
    profileNameEl.addEventListener("click", openProfilePage);
}
if (profileIdEl) {
    profileIdEl.addEventListener("click", openProfilePage);
}

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

    if (balanceEl)        balanceEl.textContent       = formatLM(balance);
    if (clickPowerEl)     clickPowerEl.textContent    = clickPower;
    if (totalClicksEl)    totalClicksEl.textContent   = totalClicks;
    if (playerLevelEl)    playerLevelEl.textContent   = ls.level;
    if (headerLevelEl)    headerLevelEl.textContent   = ls.level;
    if (headerBalanceEl)  headerBalanceEl.textContent = formatLM(balance);
    if (levelProgressBar) levelProgressBar.style.width =
        `${Math.round((ls.progress || 0) * 100)}%`;

    if (multiplierEl) {
        multiplierEl.textContent = `x${clickMultiplier.toFixed(
            clickMultiplier % 1 === 0 ? 0 : 1
        )}`;
    }

    // 🏅 текст под прогресс-баром: лига + сколько кликов до следующего уровня
    if (levelHintEl) {
        const league = getLeagueForLevel(ls.level);
        const leftClicks    = Math.max(0, (ls.required ?? 0) - (ls.current ?? 0));
        const percentToNext = Math.round((ls.progress || 0) * 100);

        const clicksText = leftClicks > 0
            ? `${leftClicks} кликов`
            : "уровень максимум";

        const prefix = league
            ? `${league.emoji} ${league.name} • `
            : "";

        levelHintEl.textContent =
            `${prefix}Осталось: ${clicksText} (${percentToNext}%)`;
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

// 🌍 глобальная стата /machine_stats/{machineId}
function subscribeGlobalMachineStats() {
    if (globalStatsSubscribed) return;
    globalStatsSubscribed = true;

    const statsCol = collection(db, "machine_stats");
    onSnapshot(
        statsCol,
        (snap) => {
            const map = { ...globalMachineStats };
            snap.docChanges().forEach((change) => {
                const id = change.doc.id;
                if (change.type === "removed") {
                    delete map[id];
                } else {
                    map[id] = change.doc.data();
                }
            });
            globalMachineStats = map;
            renderMachines();
            recomputeAggregateMachineStats();
        },
        (err) => console.error("machine_stats subscribe error", err)
    );
}

// 👤 персональная стата users/{uid}/machineStats/{machineId}
function subscribeUserMachineStats(userUid) {
    const colRef = collection(db, "users", userUid, "machineStats");
    onSnapshot(
        colRef,
        (snap) => {
            const map = {};
            snap.forEach((d) => {
                map[d.id] = d.data();
            });
            userMachineStats = map;
            renderMachines();
            recomputeAggregateMachineStats();
        },
        (err) => console.error("user machineStats subscribe error", err)
    );
}

// ====== Статистика конкретного автомата в оверлее ======
function updateMachineStatsSummary(machineId) {
    if (!machineStatsSummaryEl || !machineId) return;

    const g = globalMachineStats[machineId] || {};
    const u = userMachineStats[machineId]   || {};

    const totalSpinsGlobal = g.totalSpins || 0;
    const totalWinsGlobal  = g.totalWins  || 0;

    const totalSpinsUser = u.spins || 0;
    const totalWinsUser  = u.wins  || 0;

    const userWinRate   = totalSpinsUser   > 0 ? (totalWinsUser   / totalSpinsUser)   * 100 : 0;
    const globalWinRate = totalSpinsGlobal > 0 ? (totalWinsGlobal / totalSpinsGlobal) * 100 : 0;

    machineStatsSummaryEl.innerHTML = `
      <div class="machine-stats-row">
        <span class="label">Баланс:</span>
        <span class="value">${formatLM(balance)} LM</span>
      </div>
      <div class="machine-stats-row">
        <span class="label">Мои игры:</span>
        <span class="value">${totalSpinsUser} (побед ${totalWinsUser}, ${userWinRate.toFixed(0)}%)</span>
      </div>
      <div class="machine-stats-row">
        <span class="label">Все игры:</span>
        <span class="value">${totalSpinsGlobal}</span>
      </div>
      <div class="machine-stats-row">
        <span class="label">Всего побед:</span>
        <span class="value">${totalWinsGlobal} (${globalWinRate.toFixed(0)}%)</span>
      </div>
    `;
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
    });

    clickMultiplier = newClickMultiplier;
}

// ==================== Инвентарь (СТАКИ) ====================

function renderInventory(items) {
    if (!inventoryEl) return;

    lastInventoryItems = items;
    inventoryEl.innerHTML = "";

    if (items.length === 0) {
        inventoryEl.textContent = "Пока пусто. Выбей что-нибудь из автомата 🎰";
        clickMultiplier = 1;
        totalCollectionValue = 0;
        renderStatsFromState();
        updateProfileCollectionValue(0);
        return;
    }

    // Бонусы и сумма коллекции
    recomputeCollectionsAndBonuses(items);
    totalCollectionValue = items.reduce((sum, item) => {
        const cfg = PRIZES[item.prizeId || item.id] || {};
        const val = item.value ?? cfg.value ?? 0;
        return sum + val * (item.count ?? 1);
    }, 0);

    updateProfileCollectionValue(totalCollectionValue);
    renderStatsFromState();

    items.forEach((item) => {
        const div = document.createElement("div");
        div.className = "inv-card";

        const prizeId = item.prizeId || item.id;
        const cfg     = PRIZES[prizeId] || {};

        const rarityMeta = RARITY_META[item.rarity || cfg.rarity || "common"] || {};
        const count      = item.count ?? 1;
        const maxGlobal  = item.maxCopiesGlobal ?? cfg.maxCopiesGlobal;

        // ❗ если maxGlobal нет — это ошибка
        const percent       = Math.min(100, Math.round((count / maxGlobal) * 100));
        const progressLabel = `${count} / ${maxGlobal}`;

        const value = item.value ?? cfg.value ?? 0;

        div.innerHTML = `
          <div class="inv-emoji">${item.emoji || cfg.emoji || "🎁"}</div>

          <div class="inv-info">
            <div class="inv-name">${item.name || cfg.name || prizeId}</div>

            <div class="inv-meta">
              <span class="inv-rarity" style="color:${rarityMeta.color}">
                ${rarityMeta.label}
              </span>
              <span class="inv-value">${value} LM</span>
            </div>

            <div class="inv-count-row">
              <span class="inv-count">x${count}</span>
            </div>

            <div class="inv-progress">
                <div class="inv-progress-bar">
                    <span class="inv-progress-text">${progressLabel}</span>
                </div>
            </div>

            <div class="inv-actions">
              <button class="inv-sell-btn" data-id="${item.id}" data-amount="1">🗑 x1</button>
              ${count >= 10 ? `<button class="inv-sell-btn" data-id="${item.id}" data-amount="10">🗑 x10</button>` : ""}
              <button class="inv-sell-btn" data-id="${item.id}" data-amount="all">🗑 All</button>
            </div>
          </div>
        `;

        inventoryEl.appendChild(div);
    });
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

        if (levelState.level > storedLevel) {
            onLevelChange(storedLevel, levelState.level, levelState);
            updateDoc(userRef, { level: levelState.level }).catch((e) =>
                console.error("update level error", e)
            );
            currentLevel = levelState.level;
        } else {
            currentLevel = storedLevel;
        }

        renderStatsFromState(levelState);

        // профиль (шапка + страница)
        renderProfileFromUserDoc(
            data,
            levelState.level,
            balance
        );

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

    balance     += gain;
    totalClicks += 1;
    renderStatsFromState();

    // пульсуем картинку, а не контейнер
    const bigClickImg = document.getElementById("bigClick");
    const pulseTarget = bigClickImg || bigClickArea;

    if (pulseTarget) {
        pulseTarget.classList.add("pulsing");
        setTimeout(() => pulseTarget.classList.remove("pulsing"), 80);
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

// ==================== Весовые шансы призов (новый слой) ====================

// если понадобится — prize.dropWeight или RARITY_META[rarity].weight
function getPrizeWeight(prizeId) {
    const prize = PRIZES[prizeId];
    if (!prize) return 1;

    if (typeof prize.dropWeight === "number" && prize.dropWeight > 0) {
        return prize.dropWeight;
    }

    const rarityKey  = prize.rarity || "common";
    const rarityMeta = RARITY_META[rarityKey] || {};
    if (typeof rarityMeta.weight === "number" && rarityMeta.weight > 0) {
        return rarityMeta.weight;
    }

    return 1;
}

// шансы для всех призов автомата
function getMachinePrizeChances(machine) {
    if (!machine || !Array.isArray(machine.prizePool)) return [];

    const weights = machine.prizePool.map((id) => getPrizeWeight(id));
    const total   = weights.reduce((sum, w) => sum + w, 0);

    if (!total) return [];

    return machine.prizePool.map((id, idx) => {
        const prize  = PRIZES[id];
        const w      = weights[idx];
        const chance = w / total; // 0..1

        return {
            id,
            prize,
            weight: w,
            chance,
        };
    });
}

// выбор приза по весам (соответствует getMachinePrizeChances)
function rollPrizeForMachine(machine) {
    if (!machine || !Array.isArray(machine.prizePool) || machine.prizePool.length === 0) {
        return null;
    }

    const entries = machine.prizePool.map((id) => ({
        id,
        weight: getPrizeWeight(id),
    })).filter((e) => e.weight > 0);

    const total = entries.reduce((sum, e) => sum + e.weight, 0);
    if (!total) return randomFrom(machine.prizePool); // fallback

    let r = Math.random() * total;
    for (const e of entries) {
        if (r < e.weight) {
            return e.id;
        }
        r -= e.weight;
    }

    return entries[entries.length - 1].id;
}

// ==================== Автоматы ====================

function renderMachines() {
    if (!machinesEl) return;
    machinesEl.innerHTML = "";

    const levelLabels = {
        0: "⭐ Стартовые автоматы",
        1: "📈 Уровень 1 — Улица",
        2: "🎰 Уровень 2 — Казино",
        3: "💎 Уровень 3 — VIP",
        5: "🦈 Уровень 5 — Джекпоты",
    };

    const levelsInUse = [...new Set(MACHINES.map(m => m.minLevel ?? 0))].sort((a, b) => a - b);

    levelsInUse.forEach((level) => {
        const machinesAtLevel = MACHINES.filter(m => (m.minLevel ?? 0) === level);
        if (!machinesAtLevel.length) return;

        const block = document.createElement("div");
        block.className = "machine-level-block";

        const title = document.createElement("div");
        title.className = "machine-level-title";
        title.textContent = levelLabels[level] || `Уровень ${level}`;
        block.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "machine-grid";

        machinesAtLevel.forEach((m) => {
            const g = globalMachineStats[m.id] || {};
            const u = userMachineStats[m.id] || {};

            const totalSpins = g.totalSpins || 0;
            const userSpins  = u.spins      || 0;
            const userPart   = uid ? ` • Твоих: ${userSpins}` : "";

            const card = document.createElement("div");
            card.className  = "machine-card";
            card.dataset.id = m.id;

            const imgSrc = m.image || "public/assets/machine.png";

            card.innerHTML = `
                <div class="machine-image">
                    <img src="${imgSrc}" alt="${m.name}">
                </div>
                <div class="machine-name">${m.name}</div>
                <div class="machine-meta">${m.price} LM / игра • доступен с ${m.minLevel}-го уровня</div>
                <div class="machine-meta">Шанс выигрыша: ${(m.winChance * 100).toFixed(0)}%</div>
                <div class="machine-meta">Всего игр: ${totalSpins}${userPart}</div>
            `;

            grid.appendChild(card);
        });

        block.appendChild(grid);
        machinesEl.appendChild(block);
    });

    machinesEl.onclick = (e) => {
        const card = e.target.closest(".machine-card");
        if (!card) return;
        const id = card.dataset.id;
        openMachineOverlay(id);
    };
}

// ==================== Кэш глобальных счётчиков призов ====================

let prizeCountersCache          = {};           // { prizeId: count }
let prizeCountersLoaded         = false;
let prizeCountersLoadingPromise = null;

async function ensurePrizeCountersCache() {
    if (prizeCountersLoaded) return;

    if (prizeCountersLoadingPromise) {
        return prizeCountersLoadingPromise;
    }

    const colRef = collection(db, "prize_counters");

    prizeCountersLoadingPromise = getDocs(colRef)
        .then((snap) => {
            const map = {};
            snap.forEach((docSnap) => {
                const data = docSnap.data() || {};
                map[docSnap.id] = data.count ?? 0;
            });
            prizeCountersCache  = map;
            prizeCountersLoaded = true;
        })
        .catch((e) => {
            console.error("ensurePrizeCountersCache error", e);
            prizeCountersLoaded = false;
        })
        .finally(() => {
            prizeCountersLoadingPromise = null;
        });

    return prizeCountersLoadingPromise;
}

// ==================== Призы с глобальным лимитом (со стэками) ====================

async function grantPrizeWithGlobalLimit(machine) {
    if (!uid) return { outcome: "error" };

    const pool = Array.isArray(machine.prizePool) ? machine.prizePool.slice() : [];
    if (!pool.length) return { outcome: "no-prize" };

    const tried = new Set();

    while (tried.size < pool.length) {
        const candidateId = rollPrizeForMachine(machine);
        if (!candidateId || tried.has(candidateId)) continue;
        tried.add(candidateId);

        const cfg = PRIZES[candidateId];
        if (!cfg) continue;

        const maxGlobal = cfg.maxCopiesGlobal ?? Infinity;

        try {
            const txResult = await runTransaction(db, async (tx) => {
                const counterRef  = doc(db, "prize_counters", candidateId);
                const counterSnap = await tx.get(counterRef);
                const data        = counterSnap.exists() ? counterSnap.data() : {};
                const used        = data.count ?? 0;

                if (Number.isFinite(maxGlobal) && used >= maxGlobal) {
                    return { outcome: "exhausted" };
                }

                const invDocRef = doc(db, "users", uid, "inventory", cfg.id);
                const invSnap   = await tx.get(invDocRef);
                const prevData  = invSnap.exists() ? invSnap.data() : {};
                const prevCount = prevData.count ?? 0;

                tx.set(
                    counterRef,
                    { count: used + 1 },
                    { merge: true }
                );

                tx.set(
                    invDocRef,
                    {
                        prizeId:   cfg.id,
                        name:      cfg.name,
                        emoji:     cfg.emoji,
                        rarity:    cfg.rarity,
                        value:     cfg.value,
                        createdAt: prevData.createdAt || serverTimestamp(),
                        count:     prevCount + 1,
                    },
                    { merge: true }
                );

                return { outcome: "win", prize: cfg };
            });

            if (txResult.outcome === "win") {
                if (prizeCountersLoaded) {
                    const prev = prizeCountersCache[cfg.id] ?? 0;
                    prizeCountersCache[cfg.id] = prev + 1;
                }
                return txResult;
            }

            if (txResult.outcome === "exhausted") {
                continue;
            }

            return { outcome: "error" };
        } catch (e) {
            console.error("grantPrizeWithGlobalLimit tx error", e);

            if (
                e.code === "resource-exhausted" ||
                (typeof e.message === "string" && e.message.includes("Quota exceeded"))
            ) {
                const invDocRef = doc(db, "users", uid, "inventory", cfg.id);
                await setDoc(
                    invDocRef,
                    {
                        prizeId: cfg.id,
                        name:    cfg.name,
                        emoji:   cfg.emoji,
                        rarity:  cfg.rarity,
                        value:   cfg.value,
                        createdAt: serverTimestamp(),
                    },
                    { merge: true }
                );
                return { outcome: "win", prize: cfg };
            }

            return { outcome: "error" };
        }
    }

    return { outcome: "no-prize" };
}

// Чистая логика спина автомата
async function spinMachine(machineId) {
    if (!uid || !userRef) {
        showToast("Сначала авторизуйся через Telegram");
        return { outcome: "no-auth" };
    }

    const machine = MACHINES.find((m) => m.id === machineId);
    if (!machine) return { outcome: "error" };

    if (currentLevel < (machine.minLevel || 0)) {
        showToast(`Этот автомат доступен с ${machine.minLevel}-го уровня`);
        return { outcome: "locked" };
    }

    if (balance < machine.price) {
        showToast("Не хватает ЛудоМани для этой игры 🪙");
        return { outcome: "no-money" };
    }

    try {
        await updateDoc(userRef, {
            balance:    increment(-machine.price),
            totalSpent: increment(machine.price),
        });
    } catch (e) {
        console.error("play: balance update error", e);
        return { outcome: "error" };
    }

    const roll = Math.random();
    const win  = roll < machine.winChance;

    try {
        const globalRef = doc(db, "machine_stats", machineId);
        await setDoc(
            globalRef,
            {
                totalSpins: increment(1),
                totalWins:  win ? increment(1) : increment(0),
            },
            { merge: true }
        );

        const userStatRef = doc(db, "users", uid, "machineStats", machineId);
        await setDoc(
            userStatRef,
            {
                spins: increment(1),
                wins:  win ? increment(1) : increment(0),
            },
            { merge: true }
        );
    } catch (e) {
        console.error("machine stats error", e);
    }

    if (!win) {
        return { outcome: "lose" };
    }

    try {
        const result = await grantPrizeWithGlobalLimit(machine);

        if (result.outcome === "win" && result.prize) {
            return { outcome: "win", prize: result.prize };
        }

        if (result.outcome === "no-prize") {
            showToast("Все призы этого автомата уже разобрали 😢");
            return { outcome: "no-prize" };
        }

        return { outcome: "error" };
    } catch (e) {
        console.error("grantPrizeWithGlobalLimit error", e);
        return { outcome: "error" };
    }
}

// список призов и их шансов + глобальный остаток
async function fillMachinePrizeStrip(machineId) {
    if (!machinePrizeStripEl) return;
    machinePrizeStripEl.innerHTML = "";

    const machine = MACHINES.find((m) => m.id === machineId);
    if (!machine) return;

    // Используем ту же логику шансов, что и при реальном спине автомата
    const entries = getMachinePrizeChances(machine); // [{ id, prize, weight, chance }, ...]

    await ensurePrizeCountersCache();
    const globalUsedMap = prizeCountersCache || {};

    entries.forEach(({ id, prize, chance }) => {
        const p = prize || PRIZES[id];
        if (!p) return;

        const rarityKey  = p.rarity || "common";
        const rarityMeta = RARITY_META[rarityKey] || {
            label: rarityKey,
            color: "#888",
        };

        const pct = (chance || 0) * 100;
        let chanceStr;

        if (pct <= 0)      chanceStr = "—";
        else if (pct < 1)  chanceStr = "< 1%";
        else if (pct < 10) chanceStr = `${pct.toFixed(1)}%`;
        else               chanceStr = `${pct.toFixed(0)}%`;

        const used      = globalUsedMap[id] || 0;
        const maxGlobal = p.maxCopiesGlobal ?? 0;

        let globalStr;
        if (maxGlobal && Number.isFinite(maxGlobal)) {
            const remaining = Math.max(0, maxGlobal - used);
            globalStr = `Глобально осталось: ${remaining} / ${maxGlobal}`;
        } else {
            globalStr = "Безлимитный приз";
        }

        const pill = document.createElement("div");
        pill.className = "machine-prize-pill";
        pill.innerHTML = `
            <span class="pill-emoji">${p.emoji}</span>
            <div class="pill-text">
              <div class="pill-name">${p.name}</div>
              <div class="pill-meta" style="color:${rarityMeta.color}">
                ${rarityMeta.label} • ${chanceStr}
              </div>
              <div class="pill-meta-secondary">
                ${globalStr}
              </div>
            </div>
            <span class="pill-value">${p.value} LM</span>
        `;

        machinePrizeStripEl.appendChild(pill);
    });
}

function openMachineOverlay(machineId) {
    const machine = MACHINES.find((m) => m.id === machineId);
    if (!machine || !machineOverlayEl) return;

    currentMachineId   = machineId;
    machineSpinRunning = false;

    if (machineResultEl) {
        machineResultEl.classList.add("hidden");
    }
    machineOverlayEl.classList.remove("spinning");

    if (machineTitleEl) machineTitleEl.textContent = machine.name;
    if (machinePriceEl) machinePriceEl.textContent = machine.price;

    fillMachinePrizeStrip(machineId);
    updateMachineStatsSummary(machineId);

    machineOverlayEl.classList.remove("hidden");
    machineOverlayEl.classList.add("active");
}

function closeMachineOverlay() {
    if (!machineOverlayEl || machineSpinRunning) return;

    machineOverlayEl.classList.remove("active");
    machineOverlayEl.classList.add("hidden");
    currentMachineId = null;
}

const LOSE_MESSAGES = [
    "Коготь почесал витрину и ушёл ни с чем.",
    "Игрушка подмигнула и снова спряталась 😏",
    "Почти зацепил… но это был байт от автомата.",
    "Автомат посчитал, что ты ещё не достаточно лудоман 🤡",
    "Коробка уже ехала к выходу… и передумала.",
    "Коготь скользнул, как твой контроль бюджета.",
    "Игрушки шепчут: «Ещё одну монетку…»",
    "Этот ход был тренировочным, следующий — рабочий.",
    "Автомат сделал вид, что лаганул. Но нет.",
    "ЛудоМани минус, опыта плюс — тоже выгода, да?"
];

async function handleMachinePlayClick() {
    if (!currentMachineId || !machineOverlayEl || machineSpinRunning) return;

    const machine = MACHINES.find((m) => m.id === currentMachineId);
    if (!machine) return;

    if (currentLevel < (machine.minLevel || 0)) {
        showToast(`Этот автомат доступен с ${machine.minLevel}-го уровня`);
        return;
    }
    if (balance < machine.price) {
        showToast("Не хватает ЛудоМани для этой игры 🪙");
        return;
    }

    machineSpinRunning = true;
    machineOverlayEl.classList.add("spinning");
    machineResultEl?.classList.add("hidden");

    try {
        await new Promise((r) => setTimeout(r, 450));

        const result = await spinMachine(currentMachineId);

        await new Promise((r) => setTimeout(r, 350));
        machineOverlayEl.classList.remove("spinning");

        if (!machineResultEl || !machineResultEmojiEl || !machineResultTextEl) {
            return;
        }

        if (result.outcome === "win" && result.prize) {
            machineResultEmojiEl.textContent = result.prize.emoji;
            machineResultTextEl.textContent  =
                `Ты вытащил: ${result.prize.name} (+${result.prize.value} LM при продаже)`;
            machineResultEl.classList.remove("hidden");
        } else if (result.outcome === "lose") {
            machineResultEmojiEl.textContent = "😢";
            const msg =
                LOSE_MESSAGES[Math.floor(Math.random() * LOSE_MESSAGES.length)];
            machineResultTextEl.textContent = msg;
            machineResultEl.classList.remove("hidden");
        } else if (result.outcome === "no-prize") {
            machineResultEmojiEl.textContent = "🧩";
            machineResultTextEl.textContent  =
                "Все топовые призы из этого автомата уже разобрали.";
            machineResultEl.classList.remove("hidden");
        }

        updateMachineStatsSummary(currentMachineId);
    } finally {
        machineSpinRunning = false;
    }
}

// ==================== Продажа предмета ====================

async function sellItem(item, requestedAmount = 1) {
    if (!userRef || !uid) return;

    const invDocRef = doc(db, "users", uid, "inventory", item.id);
    const totalCount = item.count ?? 1;

    // нормализуем количество: 1 / 10 / all
    let sellCount;
    if (requestedAmount === "all") {
        sellCount = totalCount;
    } else {
        const n = Number(requestedAmount);
        sellCount = Number.isFinite(n) && n > 0 ? n : 1;
        sellCount = Math.min(sellCount, totalCount);
    }

    if (sellCount <= 0) return;

    const prizeId   = item.prizeId || item.id;
    const cfg       = PRIZES[prizeId] || {};
    const baseValue = item.value ?? cfg.value ?? 0;
    const totalValue = baseValue * sellCount;

    try {
        if (sellCount >= totalCount) {
            await deleteDoc(invDocRef);
        } else {
            await updateDoc(invDocRef, {
                count: increment(-sellCount),
            });
        }

        await updateDoc(userRef, {
            balance:     increment(totalValue),
            totalEarned: increment(totalValue),
        });

        const counterRef = doc(db, "prize_counters", prizeId);

        await runTransaction(db, async (tx) => {
            const snap = await tx.get(counterRef);
            if (!snap.exists()) return;

            const data    = snap.data() || {};
            const current = data.count ?? 0;
            const next    = current > sellCount ? current - sellCount : 0;

            tx.set(
                counterRef,
                { count: next },
                { merge: true }
            );
        });
    } catch (e) {
        console.error("sell error", e);
    } finally {
        if (prizeCountersLoaded) {
            const prev = prizeCountersCache[prizeId] ?? 0;
            const next = prev > sellCount ? prev - sellCount : 0;
            prizeCountersCache[prizeId] = next;
        }
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

if (machineOverlayEl) {
    machineOverlayEl.addEventListener("click", (e) => {
        if (e.target === machineOverlayEl) {
            closeMachineOverlay();
        }
    });
}

if (machineCloseBtn) machineCloseBtn.addEventListener("click", closeMachineOverlay);
if (machinePlayBtn)  machinePlayBtn.addEventListener("click", handleMachinePlayClick);

if (loginBtn)   loginBtn.addEventListener("click", loginWithTelegram);
if (upgradeBtn) upgradeBtn.addEventListener("click", handleUpgrade);

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

// 🔗 обработчик кнопок продажи в инвентаре (x1 / x10 / All)
if (inventoryEl) {
    inventoryEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".inv-sell-btn");
        if (!btn) return;

        const id      = btn.dataset.id;
        const amount  = btn.dataset.amount || "1";
        const item    = lastInventoryItems.find((it) => String(it.id) === String(id));

        if (!item) return;
        sellItem(item, amount);
    });
}


// ==================== onAuthStateChanged ====================

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    if (uid === user.uid && userRef) return;

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    await afterFirebaseLogin(user.uid, tgUser || null);
});

// ==================== Стартовые подписки ====================

subscribeGlobalMachineStats(); // глобальные "Всего игр"

if (isTelegramWebApp()) {
    loginInsideMiniApp().catch((e) =>
        console.error("auto miniapp login error", e)
    );
}

renderMachines();
