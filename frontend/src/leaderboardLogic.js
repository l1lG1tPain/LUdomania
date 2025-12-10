// src/leaderboardLogic.js
import { db } from "./firebase.js";
import {
    collection,
    getDocs,
} from "firebase/firestore";

let uiInitialized        = false;
let leaderboardLoaded    = false;
let leaderboardLoading   = false;

let disposeFn            = null;

let state = {
    currentUid: null,
    currentMetric: "level", // "level" | "wealth" | "collection"
    byLevel: [],
    byWealth: [],
    byCollection: [],
    meMetrics: null,        // последние метрики текущего игрока
};

let dom = {
    rootEl:       null,
    listEl:       null,
    tabLevelEl:   null,
    tabWealthEl:  null,
    tabCollectEl: null,
    nameEl:       null,
};

function attachDom() {
    dom.rootEl       = document.getElementById("profileLeaderboard");
    dom.listEl       = document.getElementById("profileLeaderboardList");
    dom.tabLevelEl   = document.getElementById("leaderboardTabLevel");
    dom.tabWealthEl  = document.getElementById("leaderboardTabWealth");
    dom.tabCollectEl = document.getElementById("leaderboardTabCollection");
    dom.nameEl       = document.getElementById("profilePageName");

    if (
        !dom.rootEl ||
        !dom.listEl ||
        !dom.tabLevelEl ||
        !dom.tabWealthEl ||
        !dom.tabCollectEl
    ) {
        return false;
    }
    return true;
}

function getSorted(metric) {
    if (metric === "wealth")     return state.byWealth;
    if (metric === "collection") return state.byCollection;
    return state.byLevel;
}

function getMetricText(user, metric) {
    switch (metric) {
        case "level":
            return `LVL ${user.level}`;
        case "wealth":
            return formatNumberWithLM(user.balance);
        case "collection":
            return formatNumberWithLM(user.collectionValue);
        default:
            return "";
    }
}

function updateTabs() {
    const tabs = [
        { el: dom.tabLevelEl,   metric: "level",      baseLabel: "По уровню" },
        { el: dom.tabWealthEl,  metric: "wealth",     baseLabel: "По богатству" },
        { el: dom.tabCollectEl, metric: "collection", baseLabel: "По коллекции" },
    ];
    tabs.forEach((t) => {
        const isActive = t.metric === state.currentMetric;
        t.el.classList.toggle("active", isActive);
        t.el.textContent = isActive ? `(${t.baseLabel})` : t.baseLabel;
    });
}

function renderList() {
    if (!dom.listEl) return;

    const metric  = state.currentMetric;
    const dataset = getSorted(metric);

    dom.listEl.innerHTML = "";

    dataset.forEach((user, index) => {
        const row = document.createElement("div");
        row.className = "profile-leaderboard-row";
        if (user.uid === state.currentUid) {
            row.classList.add("me");
        }

        const place      = index + 1;
        const metricText = getMetricText(user, metric);

        row.innerHTML = `
            <span class="pl-name">${user.name}</span>
            <span class="pl-metric">${metricText}</span>
            <span class="pl-place">#${place}</span>
        `;

        dom.listEl.appendChild(row);
    });
}

function updateNameTag() {
    if (!dom.nameEl || !state.currentUid) return;

    const meIndexByLevel = state.byLevel.findIndex(
        (u) => u.uid === state.currentUid
    );
    const mePlaceByLevel =
        meIndexByLevel >= 0 ? meIndexByLevel + 1 : null;

    const meUser =
        state.byLevel.find((u) => u.uid === state.currentUid) ||
        state.meMetrics ||
        null;

    if (!meUser) return;

    const tag = mePlaceByLevel ? ` #${mePlaceByLevel}` : "";
    dom.nameEl.textContent = `${meUser.name}${tag}`;
}

function applySorts(users) {
    // по уровню (level -> totalEarned)
    state.byLevel = [...users].sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return (b.totalEarned ?? 0) - (a.totalEarned ?? 0);
    });

    // по богатству (balance -> totalEarned)
    state.byWealth = [...users].sort((a, b) => {
        if (b.balance !== a.balance) return b.balance - a.balance;
        return (b.totalEarned ?? 0) - (a.totalEarned ?? 0);
    });

    // по коллекции (collectionValue -> collectionCount)
    state.byCollection = [...users].sort((a, b) => {
        if (b.collectionValue !== a.collectionValue) {
            return b.collectionValue - a.collectionValue;
        }
        return (b.collectionCount ?? 0) - (a.collectionCount ?? 0);
    });
}

async function loadLeaderboardOnce() {
    if (leaderboardLoaded || leaderboardLoading) return;
    leaderboardLoading = true;

    try {
        const colRef = collection(db, "users");
        const snap   = await getDocs(colRef);

        const users = [];
        snap.forEach((docSnap) => {
            const data = docSnap.data() || {};
            users.push({
                uid: docSnap.id,
                name:
                    data.firstName ||
                    data.username ||
                    data.displayName ||
                    "Игрок",
                level:           data.level            ?? 0,
                balance:         data.balance          ?? 0,
                totalEarned:     data.totalEarned      ?? 0,
                collectionValue: data.collectionValue  ?? 0,
                collectionCount: data.collectionCount  ?? 0,
            });
        });

        // гарантируем наличие текущего игрока (если его ещё нет в users)
        if (state.currentUid) {
            const found = users.some((u) => u.uid === state.currentUid);
            if (!found && state.meMetrics) {
                users.push({
                    uid:              state.currentUid,
                    name:             state.meMetrics.name || "Игрок",
                    level:            state.meMetrics.level           ?? 0,
                    balance:          state.meMetrics.balance         ?? 0,
                    totalEarned:      state.meMetrics.totalEarned     ?? 0,
                    collectionValue:  state.meMetrics.collectionValue ?? 0,
                    collectionCount:  state.meMetrics.collectionCount ?? 0,
                });
            }
        }

        applySorts(users);
        leaderboardLoaded  = true;
        leaderboardLoading = false;

        updateNameTag();
        renderList();
    } catch (err) {
        console.error("Ошибка загрузки рейтинга игроков", err);
        leaderboardLoading = false;
    }
}

function patchCurrentUserMetrics(metrics) {
    if (!state.currentUid || !metrics) return;

    state.meMetrics = {
        ...(state.meMetrics || {}),
        ...metrics,
    };

    const uids = new Set();
    const arrays = [state.byLevel, state.byWealth, state.byCollection];

    arrays.forEach((arr) =>
        arr.forEach((u) => {
            uids.add(u.uid);
        })
    );

    if (!uids.size) return;

    const applyPatch = (user) => {
        if (user.uid !== state.currentUid) return user;
        return {
            ...user,
            name:             metrics.name             ?? user.name,
            level:            metrics.level            ?? user.level,
            balance:          metrics.balance          ?? user.balance,
            totalEarned:      metrics.totalEarned      ?? user.totalEarned,
            collectionValue:  metrics.collectionValue  ?? user.collectionValue,
            collectionCount:  metrics.collectionCount  ?? user.collectionCount,
        };
    };

    state.byLevel      = state.byLevel.map(applyPatch);
    state.byWealth     = state.byWealth.map(applyPatch);
    state.byCollection = state.byCollection.map(applyPatch);

    // пересортировка после обновления метрик
    applySorts(
        // берём объединённый список уникальных пользователей
        [
            ...new Map(
                [...state.byLevel, ...state.byWealth, ...state.byCollection].map((u) => [
                    u.uid,
                    u,
                ])
            ).values(),
        ]
    );

    updateNameTag();
    renderList();
}

function initUiOnce() {
    if (uiInitialized) return;
    if (!attachDom()) return;

    uiInitialized = true;

    const tabs = [
        { el: dom.tabLevelEl,   metric: "level" },
        { el: dom.tabWealthEl,  metric: "wealth" },
        { el: dom.tabCollectEl, metric: "collection" },
    ];

    tabs.forEach((t) => {
        t.el.addEventListener("click", () => {
            if (state.currentMetric === t.metric) return;
            state.currentMetric = t.metric;
            updateTabs();
            renderList();
        });
    });

    state.currentMetric = "level";
    updateTabs();

    disposeFn = () => {
        uiInitialized     = false;
        leaderboardLoaded = false;
        leaderboardLoading = false;

        state.byLevel      = [];
        state.byWealth     = [];
        state.byCollection = [];
        state.meMetrics    = null;

        if (dom.listEl) dom.listEl.innerHTML = "";
    };
}

/**
 * Инициализация лидерборда на странице профиля.
 * currentUid            – id текущего игрока
 * _currentUserMetrics   – актуальные метрики игрока (level, balance, collectionValue и т.д.)
 */
export function initProfileLeaderboards(currentUid, _currentUserMetrics = {}) {
    state.currentUid = currentUid;
    state.meMetrics  = {
        ...(state.meMetrics || {}),
        ..._currentUserMetrics,
    };

    initUiOnce();
    if (!uiInitialized) return;

    // если данные уже загружены — просто подправляем текущего игрока локально
    if (leaderboardLoaded) {
        patchCurrentUserMetrics(_currentUserMetrics);
        return;
    }

    // если ещё не загружали — тянем один раз из Firestore
    loadLeaderboardOnce();
}

/**
 * На случай logout / смены страницы.
 */
export function disposeProfileLeaderboards() {
    if (disposeFn) {
        disposeFn();
    }
}

/**
 * Красивое форматирование LM: 12k / 2.3m / 1.1b LM
 */
function formatNumberWithLM(value) {
    const num = Number(value) || 0;
    if (num < 10000) return `${num} LM`;

    const units = [
        { v: 1e9, s: "b" },
        { v: 1e6, s: "m" },
        { v: 1e3, s: "k" },
    ];
    for (const u of units) {
        if (num >= u.v) {
            return `${(num / u.v).toFixed(1)}${u.s} LM`;
        }
    }
    return `${num} LM`;
}
