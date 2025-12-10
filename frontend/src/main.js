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
import { initProfileLeaderboards } from "./leaderboardLogic.js";
import { getCollectorRank } from "./ranksLogic.js";

import imgBronze from "./assets/LudoMoney.png";
import imgSilver from "./assets/LudoMoney_2.png";
import imgGold from "./assets/LudoMoney.png";
import imgPlatinum from "./assets/LudoMoney.png";
import imgDiamond from "./assets/LudoMoney.png";

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

// Визуал, завязанный на лигу
const bigClickImg                  = document.getElementById("bigClick");
const profileLvlBadgeEl            = document.querySelector(".profile-lvl-badge");
const profileLeagueChipEl          = document.getElementById("profilePageLeague");
const profileLeagueProgressFillEl  = document.getElementById("profileLeagueProgressFill");

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

// inventory модалки
const inventoryModalEl              = document.getElementById("inventoryModal");
const inventoryModalCloseBtn        = document.getElementById("inventoryModalClose");
const inventoryModalEmojiEl         = document.getElementById("inventoryModalEmoji");
const inventoryModalNameEl          = document.getElementById("inventoryModalName");
const inventoryModalRarityEl        = document.getElementById("inventoryModalRarity");
const inventoryModalValueEl         = document.getElementById("inventoryModalValue");
const inventoryModalCountEl         = document.getElementById("inventoryModalCount");
const inventoryModalProgressFillEl  = document.getElementById("inventoryModalProgressFill");
const inventoryModalProgressTextEl  = document.getElementById("inventoryModalProgressText");
const invSellBtn1  = document.getElementById("inventorySell1");
const invSellBtn10 = document.getElementById("inventorySell10");
const invSellBtnAll= document.getElementById("inventorySellAll");

// модалка подтверждения продажи
const sellConfirmModalEl  = document.getElementById("sellConfirmModal");
const sellConfirmTextEl   = document.getElementById("sellConfirmText");
const sellConfirmYesBtn   = document.getElementById("sellConfirmYes");
const sellConfirmNoBtn    = document.getElementById("sellConfirmNo");

const profileLeagueProgressFill = document.getElementById("profileLeagueProgressFill");


// ==================== Состояние ====================

let uid            = null;
let userRef        = null;
let clickPower     = 1;
let balance        = 0;
let totalClicks    = 0;
let currentLevel   = 0;
let authInProgress = false;

let clickMultiplier      = 1;
let totalCollectionValue = 0;

let lastInventoryItems     = [];
let currentInventoryItem   = null;
let pendingSellAmount      = null;

let globalMachineStats = {};
let userMachineStats   = {};

const BOT_USERNAME = "LUdomania_app_bot";

const API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://ludomania.onrender.com";

// порядок редкостей для группировки
const RARITY_ORDER = {
    legendary: 0,
    mythic:    0,
    relic:     0,
    epic:      1,
    rare:      2,
    uncommon:  3,
    common:    4,
};

// ==================== Буфер кликов ====================

const ACTIVE_FLUSH_MS  = 7000;
const PASSIVE_FLUSH_MS = 15000;
const FLUSH_BATCH_THRESHOLD = 300;

let farmBuffer = {
    balanceDelta:     0,
    totalClicksDelta: 0,
    totalEarnedDelta: 0,
};

let farmBufferFlushTimer = null;
let lastClickTimestamp   = 0;

async function flushFarmBuffer(reason = "timer") {
    if (!userRef || !uid) return;

    const {
        balanceDelta,
        totalClicksDelta,
        totalEarnedDelta,
    } = farmBuffer;

    if (!balanceDelta && !totalClicksDelta && !totalEarnedDelta) {
        farmBufferFlushTimer = null;
        return;
    }

    farmBuffer = {
        balanceDelta:     0,
        totalClicksDelta: 0,
        totalEarnedDelta: 0,
    };
    farmBufferFlushTimer = null;

    try {
        await updateDoc(userRef, {
            ...(balanceDelta     ? { balance:     increment(balanceDelta) }     : {}),
            ...(totalClicksDelta ? { totalClicks: increment(totalClicksDelta) } : {}),
            ...(totalEarnedDelta ? { totalEarned: increment(totalEarnedDelta) } : {}),
        });
    } catch (e) {
        console.error("flushFarmBuffer error", reason, e);
    }
}

function scheduleFarmBufferFlush() {
    if (!userRef || !uid) return;

    const now = Date.now();

    if (farmBuffer.totalClicksDelta >= FLUSH_BATCH_THRESHOLD) {
        flushFarmBuffer("threshold");
        return;
    }

    if (farmBufferFlushTimer) return;

    const msSinceLastClick = now - lastClickTimestamp;

    const useActiveTimer =
        farmBuffer.totalClicksDelta > 0 &&
        msSinceLastClick <= ACTIVE_FLUSH_MS;

    farmBufferFlushTimer = setTimeout(() => {
        flushFarmBuffer(useActiveTimer ? "active-timer" : "passive-timer");
    }, useActiveTimer ? ACTIVE_FLUSH_MS : PASSIVE_FLUSH_MS);
}

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

// ==================== Лигозависимый визуал (кнопка + прогресс) ====================

const LEAGUE_THEME_CONFIG = {
    bronze: { buttonSrc: imgBronze },
    silver: { buttonSrc: imgSilver },
    gold: { buttonSrc: imgGold },
    platinum: { buttonSrc: imgPlatinum },
    diamond: { buttonSrc: imgDiamond },
};

// ==================== Лигозависимый визуал ====================

// 1. Сначала объявляем классы
const LEAGUE_CLASSES = [
    "league-bronze",
    "league-silver",
    "league-gold",
    "league-platinum",
    "league-diamond"
];

// 2. Потом функция applyLeagueVisuals
function applyLeagueVisuals(league) {
    const leagueId = league?.id || "bronze";
    const leagueClass = `league-${leagueId}`;

    const apply = (el) => {
        if (!el) return;
        LEAGUE_CLASSES.forEach(cls => el.classList.remove(cls));
        el.classList.add(leagueClass);
    };

    apply(levelProgressBar);
    apply(profileLeagueProgressFillEl);
    apply(bigClickImg);
    apply(profileLvlBadgeEl);
    apply(profileLeagueChipEl);
}



// ==================== Визуал приза (emoji / img) ====================

function renderPrizeIcon(targetEl, prizeId, fallbackEmoji = "🎁") {
    if (!targetEl) return;

    const prize = PRIZES[prizeId];

    while (targetEl.firstChild) {
        targetEl.removeChild(targetEl.firstChild);
    }

    if (prize && prize.type === "nft" && prize.imageUrl) {
        const img = document.createElement("img");
        img.src = prize.imageUrl;
        img.alt = prize.name || prizeId;
        img.loading = "lazy";
        img.className = "prize-icon-img";
        targetEl.appendChild(img);
    } else {
        const span = document.createElement("span");
        span.textContent = (prize && prize.emoji) || fallbackEmoji;
        targetEl.appendChild(span);
    }
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

bottomNavItems.forEach((item) => {
    item.addEventListener("click", () => {
        const target = item.dataset.target;
        if (!target) return;
        setActivePage(target);
    });
});

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

function renderStatsFromState(levelStateOverride) {
    const ls     = levelStateOverride || calculateLevelState(totalClicks);
    const league = getLeagueForLevel(ls.level);

    if (balanceEl)        balanceEl.textContent       = formatLM(balance);
    if (clickPowerEl)     clickPowerEl.textContent    = clickPower;
    if (totalClicksEl)    totalClicksEl.textContent   = totalClicks;
    if (playerLevelEl)    playerLevelEl.textContent   = ls.level;
    if (headerLevelEl)    headerLevelEl.textContent   = ls.level;
    if (headerBalanceEl)  headerBalanceEl.textContent = formatLM(balance);

    if (levelProgressBar) {
        levelProgressBar.style.width =
            `${Math.round((ls.progress || 0) * 100)}%`;
    }

    // 🔥 тут привязываем все цвета/тени к текущей лиге
    applyLeagueVisuals(league);

    if (multiplierEl) {
        multiplierEl.textContent = `x${clickMultiplier.toFixed(
            clickMultiplier % 1 === 0 ? 0 : 1
        )}`;
    }

    if (levelHintEl) {
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

function openInventoryModal(item) {
    if (!inventoryModalEl) return;

    currentInventoryItem = item;

    const prizeId    = item.prizeId || item.id;
    const cfg        = PRIZES[prizeId] || {};
    const rarityKey  = item.rarity || cfg.rarity || "common";
    const rarityMeta = RARITY_META[rarityKey] || { label: rarityKey, color: "#888" };

    const count     = item.count ?? 1;
    const maxGlobal = item.maxCopiesGlobal ?? cfg.maxCopiesGlobal;
    const percent   = (maxGlobal && Number.isFinite(maxGlobal))
        ? Math.min(100, Math.round((count / maxGlobal) * 100))
        : 100;

    const progressLabel = maxGlobal
        ? `${count} / ${maxGlobal}`
        : `${count}`;

    const value = item.value ?? cfg.value ?? 0;

    if (inventoryModalNameEl)   inventoryModalNameEl.textContent   = item.name || cfg.name || prizeId;
    if (inventoryModalRarityEl) {
        inventoryModalRarityEl.textContent = rarityMeta.label;
        inventoryModalRarityEl.style.color = rarityMeta.color;
    }
    if (inventoryModalValueEl)  inventoryModalValueEl.textContent  = `${value} LM`;
    if (inventoryModalCountEl)  inventoryModalCountEl.textContent  = `x${count}`;
    if (inventoryModalProgressFillEl) {
        inventoryModalProgressFillEl.style.width = `${percent}%`;
    }
    if (inventoryModalProgressTextEl) {
        inventoryModalProgressTextEl.textContent = progressLabel;
    }

    if (inventoryModalEmojiEl) {
        renderPrizeIcon(
            inventoryModalEmojiEl,
            prizeId,
            item.emoji || cfg.emoji || "🎁"
        );
    }

    if (invSellBtn10) {
        invSellBtn10.disabled = count < 10;
    }

    inventoryModalEl.classList.remove("hidden");
    inventoryModalEl.classList.add("active");
}

function closeInventoryModal() {
    if (!inventoryModalEl) return;
    inventoryModalEl.classList.remove("active");
    inventoryModalEl.classList.add("hidden");
    currentInventoryItem = null;
    pendingSellAmount    = null;
}

function openSellConfirmModal(amount) {
    if (!sellConfirmModalEl || !sellConfirmTextEl || !currentInventoryItem) return;

    pendingSellAmount = amount;

    const prizeId   = currentInventoryItem.prizeId || currentInventoryItem.id;
    const cfg       = PRIZES[prizeId] || {};
    const totalCnt  = currentInventoryItem.count ?? 1;

    let sellCount;
    if (amount === "all") {
        sellCount = totalCnt;
    } else {
        const n = Number(amount);
        sellCount = Math.min(totalCnt, Number.isFinite(n) && n > 0 ? n : 1);
    }

    const baseValue  = currentInventoryItem.value ?? cfg.value ?? 0;
    const totalValue = baseValue * sellCount;

    const name = currentInventoryItem.name || cfg.name || prizeId;

    sellConfirmTextEl.textContent =
        `🪙 Продать x${sellCount} «${name}» за ${totalValue} LM?`;

    sellConfirmModalEl.classList.remove("hidden");
    sellConfirmModalEl.classList.add("active");
}

function closeSellConfirmModal() {
    if (!sellConfirmModalEl) return;
    sellConfirmModalEl.classList.remove("active");
    sellConfirmModalEl.classList.add("hidden");
    pendingSellAmount = null;
}

function renderInventory(items) {
    if (!inventoryEl) return;

    lastInventoryItems = items;
    inventoryEl.innerHTML = "";

    if (items.length === 0) {
        inventoryEl.textContent = "Пока пусто. Выбей что-нибудь из автомата 🎰";

        clickMultiplier      = 1;
        totalCollectionValue = 0;

        updateProfileCollectionValue(0, 0);
        renderStatsFromState();

        if (userRef) {
            updateDoc(userRef, {
                collectionValue:   0,
                collectionCount:   0,
                collectorRankTier: 1,
            }).catch(e => console.error("update empty collection error", e));
        }

        return;
    }

    recomputeCollectionsAndBonuses(items);

    const { totalValue, totalCount } = items.reduce(
        (acc, item) => {
            const cfg   = PRIZES[item.prizeId || item.id] || {};
            const val   = item.value ?? cfg.value ?? 0;
            const count = item.count ?? 1;

            acc.totalValue += val * count;
            acc.totalCount += count;
            return acc;
        },
        { totalValue: 0, totalCount: 0 }
    );

    totalCollectionValue = totalValue;

    updateProfileCollectionValue(totalValue, totalCount);
    renderStatsFromState();

    if (userRef) {
        let collectorRankTier = null;
        try {
            const collectorRank = getCollectorRank({
                totalCollectionValue: totalValue,
                totalPrizesCount:     totalCount,
            });
            collectorRankTier = collectorRank?.tier ?? null;
        } catch (e) {
            console.error("collector rank calc error", e);
        }

        const payload = {
            collectionValue: totalValue,
            collectionCount: totalCount,
        };
        if (collectorRankTier !== null) {
            payload.collectorRankTier = collectorRankTier;
        }

        updateDoc(userRef, payload).catch(err =>
            console.error("update collection stats error", err)
        );
    }

    const groups = new Map();

    items.forEach((item) => {
        const prizeId    = item.prizeId || item.id;
        const cfg        = PRIZES[prizeId] || {};
        const rarityKey  = item.rarity || cfg.rarity || "common";
        const rarityMeta = RARITY_META[rarityKey] || { label: rarityKey, color: "#888" };

        const key = rarityKey;
        if (!groups.has(key)) {
            groups.set(key, { meta: rarityMeta, items: [] });
        }
        groups.get(key).items.push(item);
    });

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
        const oa = RARITY_ORDER[a] ?? 999;
        const ob = RARITY_ORDER[b] ?? 999;
        if (oa !== ob) return oa - ob;
        return a.localeCompare(b);
    });

    sortedKeys.forEach((rarityKey) => {
        const group = groups.get(rarityKey);
        if (!group) return;

        const block = document.createElement("div");
        block.className = "inv-rarity-block";

        const title = document.createElement("div");
        title.className = "inv-rarity-title";
        title.textContent = group.meta.label;
        title.style.color = group.meta.color;
        block.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "inventory-grid";

        group.items.forEach((item) => {
            const div = document.createElement("div");
            div.className  = "inv-card";
            div.dataset.id = item.id;

            const prizeId    = item.prizeId || item.id;
            const cfg        = PRIZES[prizeId] || {};
            const count      = item.count ?? 1;
            const maxGlobal  = item.maxCopiesGlobal ?? cfg.maxCopiesGlobal;

            const percent = (maxGlobal && Number.isFinite(maxGlobal))
                ? Math.min(100, Math.round((count / maxGlobal) * 100))
                : 100;

            const progressLabel = maxGlobal
                ? `${count} / ${maxGlobal}`
                : `${count}`;

            const value = item.value ?? cfg.value ?? 0;

            div.innerHTML = `
              <div class="inv-emoji"></div>

              <div class="inv-info">
                <div class="inv-name">${item.name || cfg.name || prizeId}</div>

                <div class="inv-meta">
                  <span class="inv-value">${value} LM</span>
                </div>

                <div class="inv-progress">
                    <div class="inv-progress-bar">
                        <div class="inv-progress-fill" style="width:${percent}%;"></div>
                    </div>
                    <div class="inv-progress-text">${progressLabel}</div>
                </div>
              </div>
            `;

            const emojiContainer = div.querySelector(".inv-emoji");
            renderPrizeIcon(
                emojiContainer,
                prizeId,
                item.emoji || cfg.emoji || "🎁"
            );

            grid.appendChild(div);
        });

        block.appendChild(grid);
        inventoryEl.appendChild(block);
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

        const levelState = calculateLevelState(totalClicks);
        currentLevel     = levelState.level;

        if ((data.level ?? 0) !== levelState.level) {
            updateDoc(userRef, { level: levelState.level }).catch((e) =>
                console.error("update level error", e)
            );
        }

        renderStatsFromState(levelState);

        renderProfileFromUserDoc(
            data,
            levelState.level,
            balance
        );

        initProfileLeaderboards(uid, {
            name:
                data.firstName ||
                data.username ||
                data.displayName ||
                "Игрок",
            level:           levelState.level,
            balance:         balance,
            totalEarned:     data.totalEarned     ?? 0,
            collectionValue: data.collectionValue ?? 0,
            collectionCount: data.collectionCount ?? 0,
        });

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

            collectionValue: 0,
            collectionCount: 0,

            collectorRankTier: 1,
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

        if (data.collectionValue === undefined) patch.collectionValue = 0;
        if (data.collectionCount === undefined) patch.collectionCount = 0;

        if (data.collectorRankTier === undefined) patch.collectorRankTier = 1;

        if (telegramInfo) {
            const tPatch = {};

            if (!data.telegram_id && telegramInfo.id) {
                tPatch.telegram_id = telegramInfo.id;
            }
            if ((!data.username || data.username === null) && telegramInfo.username) {
                tPatch.username = telegramInfo.username;
            }
            if ((!data.firstName || data.firstName === "") && telegramInfo.first_name) {
                tPatch.firstName = telegramInfo.first_name;
            }
            if ((!data.photoUrl || data.photoUrl === null) && telegramInfo.photo_url) {
                tPatch.photoUrl = telegramInfo.photo_url;
            }

            Object.assign(patch, tPatch);
        }

        if (Object.keys(patch).length > 0) {
            await updateDoc(ref, patch);
        }

        await updateDoc(ref, { lastLogin: serverTimestamp() });
    }
}

// ==================== Кликер (с буфером) ====================

function handleClick() {
    if (!uid || !userRef) {
        showToast("Сначала авторизуйся через Telegram");
        return;
    }

    lastClickTimestamp = Date.now();

    const gain = clickPower * clickMultiplier;

    balance     += gain;
    totalClicks += 1;
    renderStatsFromState();

    const bigClickImg = document.getElementById("bigClick");
    const pulseTarget = bigClickImg || bigClickArea;

    if (pulseTarget) {
        pulseTarget.classList.add("pulsing");
        setTimeout(() => pulseTarget.classList.remove("pulsing"), 80);
    }

    farmBuffer.balanceDelta     += gain;
    farmBuffer.totalClicksDelta += 1;
    farmBuffer.totalEarnedDelta += gain;

    scheduleFarmBufferFlush();
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

    if (upgradeBtn) upgradeBtn.disabled = true;

    try {
        const result = await runTransaction(db, async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists()) {
                throw new Error("user-not-found");
            }

            const data           = snap.data() || {};
            const currentBalance = data.balance    ?? 0;
            const currentPower   = data.clickPower ?? 1;
            const storedLevel    = data.level      ?? currentLevel;
            const txMaxPower     = getMaxClickPower(storedLevel);
            const txUpgradeCost  = getUpgradeCost(currentPower);

            if (currentPower >= txMaxPower) {
                throw new Error("power-cap");
            }

            if (currentBalance < txUpgradeCost) {
                throw new Error("no-money");
            }

            const newBalance = currentBalance - txUpgradeCost;
            const newPower   = currentPower + 1;

            tx.update(userRef, {
                balance:    newBalance,
                clickPower: newPower,
                totalSpent: increment(txUpgradeCost),
            });

            return {
                balance:    newBalance,
                clickPower: newPower,
            };
        });

        balance    = result.balance;
        clickPower = result.clickPower;
        renderStatsFromState();
    } catch (e) {
        if (e.message === "no-money") {
            showToast("Недостаточно ЛудоМани для апгрейда 💸");
        } else if (e.message === "power-cap") {
            showToast(
                `Лимит силы клика на уровне ${currentLevel}. Накликай до следующего уровня!`
            );
        } else if (e.message === "user-not-found") {
            showToast("Профиль не найден, перезайди в игру");
            console.error("upgrade error: user not found");
        } else {
            console.error("upgrade tx error", e);
            showToast("Ошибка апгрейда, попробуй ещё раз");
        }
    } finally {
        if (upgradeBtn) upgradeBtn.disabled = false;
    }
}

// ==================== Весовые шансы призов ====================

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

function getMachinePrizeChances(machine) {
    if (!machine || !Array.isArray(machine.prizePool)) return [];

    const weights = machine.prizePool.map((id) => getPrizeWeight(id));
    const total   = weights.reduce((sum, w) => sum + w, 0);

    if (!total) return [];

    return machine.prizePool.map((id, idx) => {
        const prize  = PRIZES[id];
        const w      = weights[idx];
        const chance = w / total;

        return {
            id,
            prize,
            weight: w,
            chance,
        };
    });
}

function rollPrizeForMachine(machine) {
    if (!machine || !Array.isArray(machine.prizePool) || machine.prizePool.length === 0) {
        return null;
    }

    const entries = machine.prizePool
        .map((id) => ({
            id,
            weight: getPrizeWeight(id),
        }))
        .filter((e) => e.weight > 0);

    const total = entries.reduce((sum, e) => sum + e.weight, 0);
    if (!total) return randomFrom(machine.prizePool);

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

let prizeCountersCache          = {};
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

// ==================== Призы с глобальным лимитом ====================

async function grantPrizeWithGlobalLimit(machine) {
    if (!uid) return { outcome: "error" };

    const pool = Array.isArray(machine.prizePool) ? machine.prizePool.slice() : [];
    if (!pool.length) return { outcome: "no-prize" };

    await ensurePrizeCountersCache();
    const globalUsedMap = prizeCountersCache || {};

    const tried = new Set();

    while (tried.size < pool.length) {
        const candidateId = rollPrizeForMachine(machine);
        if (!candidateId || tried.has(candidateId)) continue;
        tried.add(candidateId);

        const cfg = PRIZES[candidateId];
        if (!cfg) continue;

        const maxGlobal = cfg.maxCopiesGlobal ?? Infinity;

        if (!Number.isFinite(maxGlobal)) {
            try {
                const invDocRef = doc(db, "users", uid, "inventory", cfg.id);
                await setDoc(
                    invDocRef,
                    {
                        prizeId:   cfg.id,
                        name:      cfg.name,
                        emoji:     cfg.emoji,
                        rarity:    cfg.rarity,
                        value:     cfg.value,
                        createdAt: serverTimestamp(),
                        count:     increment(1),
                    },
                    { merge: true }
                );
                return { outcome: "win", prize: cfg };
            } catch (e) {
                console.error("grantPrizeWithGlobalLimit unlimited prize error", e);
                return { outcome: "error" };
            }
        }

        const usedFromCache = globalUsedMap[cfg.id] ?? 0;
        if (usedFromCache >= maxGlobal) {
            continue;
        }

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

            if (txResult.outcome === "win" && txResult.prize) {
                if (prizeCountersLoaded) {
                    const prev = globalUsedMap[cfg.id] ?? 0;
                    globalUsedMap[cfg.id] = prev + 1;
                    prizeCountersCache     = globalUsedMap;
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
                try {
                    const invDocRef = doc(db, "users", uid, "inventory", cfg.id);
                    await setDoc(
                        invDocRef,
                        {
                            prizeId:   cfg.id,
                            name:      cfg.name,
                            emoji:     cfg.emoji,
                            rarity:    cfg.rarity,
                            value:     cfg.value,
                            createdAt: serverTimestamp(),
                            count:     increment(1),
                        },
                        { merge: true }
                    );
                    return { outcome: "win", prize: cfg };
                } catch (e2) {
                    console.error("fallback prize grant error", e2);
                    return { outcome: "error" };
                }
            }

            return { outcome: "error" };
        }
    }

    return { outcome: "no-prize" };
}

// ==================== Логика спина автомата ====================

async function spinMachine(machineId) {
    if (!uid || !userRef) {
        showToast("Сначала авторизуйся через Telegram");
        return { outcome: "no-auth" };
    }

    try {
        await flushFarmBuffer("before-spin");
    } catch (e) {
        console.error("flush before spin error", e);
    }

    const machine = MACHINES.find((m) => m.id === machineId);
    if (!machine) return { outcome: "error" };

    if (currentLevel < (machine.minLevel || 0)) {
        showToast(`Этот автомат доступен с ${machine.minLevel}-го уровня`);
        return { outcome: "locked" };
    }

    let newBalance = balance;

    try {
        const txResult = await runTransaction(db, async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists()) {
                throw new Error("user-not-found");
            }

            const data           = snap.data() || {};
            const currentBalance = data.balance ?? 0;
            const price          = machine.price;

            if (currentBalance < price) {
                throw new Error("no-money");
            }

            const updatedBalance = currentBalance - price;

            tx.update(userRef, {
                balance:    updatedBalance,
                totalSpent: increment(price),
            });

            return updatedBalance;
        });

        newBalance = txResult;
    } catch (e) {
        if (e.message === "no-money") {
            showToast("Не хватает ЛудоМани для этой игры 🪙");
            return { outcome: "no-money" };
        }
        if (e.message === "user-not-found") {
            showToast("Профиль не найден, перезайди в игру");
            console.error("spinMachine error: user not found");
            return { outcome: "error" };
        }

        console.error("play: balance tx error", e);
        showToast("Ошибка списания, попробуй ещё раз");
        return { outcome: "error" };
    }

    balance = newBalance;
    if (balance < 0) balance = 0;
    renderStatsFromState();

    const roll = Math.random();
    const win  = roll < machine.winChance;

    try {
        const globalRef   = doc(db, "machine_stats", machineId);
        const userStatRef = doc(db, "users", uid, "machineStats", machineId);

        await Promise.all([
            setDoc(
                globalRef,
                {
                    totalSpins: increment(1),
                    totalWins:  win ? increment(1) : increment(0),
                },
                { merge: true }
            ),
            setDoc(
                userStatRef,
                {
                    spins: increment(1),
                    wins:  win ? increment(1) : increment(0),
                },
                { merge: true }
            ),
        ]);
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

// ==================== Стрип призов в оверлее ====================

async function fillMachinePrizeStrip(machineId) {
    if (!machinePrizeStripEl) return;
    machinePrizeStripEl.innerHTML = "";

    const machine = MACHINES.find((m) => m.id === machineId);
    if (!machine) return;

    const entries = getMachinePrizeChances(machine);

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
            <span class="pill-emoji"></span>
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

        const pillEmojiEl = pill.querySelector(".pill-emoji");
        renderPrizeIcon(pillEmojiEl, id, p.emoji || "🎁");

        machinePrizeStripEl.appendChild(pill);
    });
}

const SPIN_COOLDOWN_MS = 700;
let lastSpinAt = 0;

// ==================== Оверлей автомата ====================

let currentMachineId   = null;
let machineSpinRunning = false;

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
    "ЛудоМани минус, опыта плюс — тоже выгода, да?",
];

async function handleMachinePlayClick() {
    const now = Date.now();

    if (now - lastSpinAt < SPIN_COOLDOWN_MS) {
        showToast("Автомат ещё перезаряжается… 😅");
        return;
    }

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

    lastSpinAt = now;

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
            const prizeId = result.prize.prizeId || result.prize.id;
            renderPrizeIcon(
                machineResultEmojiEl,
                prizeId,
                result.prize.emoji || "🎁"
            );

            machineResultTextEl.textContent =
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

let sellInProgress = false;

async function sellItem(item, requestedAmount = 1) {
    if (!userRef || !uid) return;
    if (sellInProgress) return;

    const invDocRef  = doc(db, "users", uid, "inventory", item.id);
    const totalCount = item.count ?? 1;

    let sellCount;
    if (requestedAmount === "all") {
        sellCount = totalCount;
    } else {
        const n = Number(requestedAmount);
        sellCount = Number.isFinite(n) && n > 0 ? n : 1;
        sellCount = Math.min(sellCount, totalCount);
    }

    if (sellCount <= 0) return;

    const prizeId    = item.prizeId || item.id;
    const cfg        = PRIZES[prizeId] || {};
    const baseValue  = item.value ?? cfg.value ?? 0;
    const totalValue = baseValue * sellCount;

    sellInProgress = true;

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

        balance += totalValue;

        const updatedItems = lastInventoryItems.map((it) => {
            if (it.id !== item.id) return it;
            const newCount = (it.count ?? 1) - sellCount;
            return {
                ...it,
                count: newCount > 0 ? newCount : 0,
            };
        }).filter(it => (it.count ?? 0) > 0);

        lastInventoryItems = updatedItems;
        recomputeCollectionsAndBonuses(updatedItems);
        renderStatsFromState();

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

        if (prizeCountersLoaded && prizeCountersCache) {
            const prev = prizeCountersCache[prizeId] ?? 0;
            prizeCountersCache[prizeId] = Math.max(0, prev - sellCount);
        }
    } catch (e) {
        console.error("sellItem error", e);
        showToast("Не удалось продать предмет, попробуй ещё раз");
    } finally {
        sellInProgress = false;
    }
}

// ==================== Интерактив: события UI ====================

if (bigClickArea) {
    const handleTap = (x, y) => {
        const gain = clickPower * clickMultiplier;
        spawnClickBubble(x, y, gain);
        handleClick();
    };

    let isTouchActive = false;

    bigClickArea.addEventListener("touchstart", (e) => {
        isTouchActive = true;
        if (e.changedTouches && e.changedTouches.length) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                handleTap(t.clientX, t.clientY);
            }
        }
    }, { passive: true });

    bigClickArea.addEventListener("click", (e) => {
        if (isTouchActive) return;
        handleTap(e.clientX, e.clientY);
    });
}

if (upgradeBtn) {
    upgradeBtn.addEventListener("click", () => {
        handleUpgrade();
    });
}

if (inventoryEl) {
    inventoryEl.addEventListener("click", (e) => {
        const card = e.target.closest(".inv-card");
        if (!card) return;

        const id   = card.dataset.id;
        const item = lastInventoryItems.find((it) => it.id === id);
        if (!item) return;

        openInventoryModal(item);
    });
}

if (inventoryModalCloseBtn) {
    inventoryModalCloseBtn.addEventListener("click", () => {
        closeInventoryModal();
    });
}
if (inventoryModalEl) {
    inventoryModalEl.addEventListener("click", (e) => {
        if (e.target === inventoryModalEl) {
            closeInventoryModal();
        }
    });
}

if (invSellBtn1) {
    invSellBtn1.addEventListener("click", () => {
        if (!currentInventoryItem) return;
        openSellConfirmModal(1);
    });
}
if (invSellBtn10) {
    invSellBtn10.addEventListener("click", () => {
        if (!currentInventoryItem) return;
        openSellConfirmModal(10);
    });
}
if (invSellBtnAll) {
    invSellBtnAll.addEventListener("click", () => {
        if (!currentInventoryItem) return;
        openSellConfirmModal("all");
    });
}

if (sellConfirmYesBtn) {
    sellConfirmYesBtn.addEventListener("click", async () => {
        if (!currentInventoryItem || pendingSellAmount == null) {
            closeSellConfirmModal();
            return;
        }
        const item  = currentInventoryItem;
        const amount = pendingSellAmount;
        closeSellConfirmModal();
        await sellItem(item, amount);
        closeInventoryModal();
    });
}
if (sellConfirmNoBtn) {
    sellConfirmNoBtn.addEventListener("click", () => {
        closeSellConfirmModal();
    });
}
if (sellConfirmModalEl) {
    sellConfirmModalEl.addEventListener("click", (e) => {
        if (e.target === sellConfirmModalEl) {
            closeSellConfirmModal();
        }
    });
}

if (machineCloseBtn) {
    machineCloseBtn.addEventListener("click", () => {
        closeMachineOverlay();
    });
}
if (machinePlayBtn) {
    machinePlayBtn.addEventListener("click", () => {
        handleMachinePlayClick();
    });
}

if (machineOverlayEl) {
    machineOverlayEl.addEventListener("click", (e) => {
        if (e.target === machineOverlayEl) {
            closeMachineOverlay();
        }
    });
}

// ==================== Авторизация через Telegram ====================

async function loginWithTelegram() {
    if (authInProgress) return;
    authInProgress = true;

    try {
        if (!isTelegramWebApp()) {
            showToast("Открой игру внутри Telegram Mini App");
            return;
        }

        const initData = window.Telegram.WebApp.initData;
        const res = await fetch(`${API_BASE}/auth/telegram`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
        });

        if (!res.ok) {
            console.error("telegram auth error", await res.text());
            showToast("Ошибка авторизации через Telegram");
            return;
        }

        const data  = await res.json();
        const token = data.token;
        if (!token) {
            showToast("Не удалось получить токен авторизации");
            return;
        }

        await signInWithCustomToken(auth, token);
    } catch (e) {
        console.error("loginWithTelegram error", e);
        showToast("Ошибка авторизации, попробуй ещё раз");
    } finally {
        authInProgress = false;
    }
}

if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        loginWithTelegram();
    });
}

// ==================== Инициализация Firebase-сессии ====================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        uid     = null;
        userRef = null;
        setActivePage("pageFarm");
        if (loginBtn) {
            loginBtn.classList.remove("hidden");
            loginBtn.disabled = false;
        }
        return;
    }

    uid = user.uid;

    if (loginBtn) {
        loginBtn.classList.add("hidden");
        loginBtn.disabled = true;
    }

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || null;
    try {
        await ensureGameFields(uid, tgUser);
    } catch (e) {
        console.error("ensureGameFields error", e);
    }

    subscribeToUser(uid);
    subscribeToInventory(uid);
    subscribeGlobalMachineStats();
    subscribeUserMachineStats(uid);

    renderMachines();
});

// ==================== Флаш буфера при уходе ====================

window.addEventListener("beforeunload", () => {
    flushFarmBuffer("beforeunload");
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        flushFarmBuffer("hidden");
    }
});

if (window.Telegram?.WebApp) {
    try {
        window.Telegram.WebApp.onEvent("backButtonClicked", () => {
            flushFarmBuffer("tg-back");
        });
    } catch (e) {
        console.error("tg backButton handler error", e);
    }
}

// ==================== Стартовое состояние ====================

setActivePage("pageFarm");
renderStatsFromState();
renderMachines();
