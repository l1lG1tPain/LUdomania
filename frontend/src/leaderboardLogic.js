// src/leaderboardLogic.js
import { db } from "./firebase.js";
import {
    collection,
    onSnapshot,
} from "firebase/firestore";

/**
 * Реалтайм-рейтинг игроков:
 *  - 3 вкладки: по уровню / по богатству / по коллекции
 *  - подписка на всю коллекцию users через onSnapshot
 *  - по дефолту активна вкладка "По уровню"
 *
 * @param {string} currentUid
 * @param {object} _currentUserMetrics - можно передавать, но сейчас не используется
 */
let leaderboardSubscribed = false;
let unsubscribeLeaderboard = null;

let state = {
    currentUid: null,
    currentMetric: "level", // "level" | "wealth" | "collection"
    byLevel: [],
    byWealth: [],
    byCollection: [],
};

export function initProfileLeaderboards(currentUid, _currentUserMetrics = {}) {
    state.currentUid = currentUid;

    const rootEl       = document.getElementById("profileLeaderboard");
    const listEl       = document.getElementById("profileLeaderboardList");
    const tabLevelEl   = document.getElementById("leaderboardTabLevel");
    const tabWealthEl  = document.getElementById("leaderboardTabWealth");
    const tabCollectEl = document.getElementById("leaderboardTabCollection");
    const nameEl       = document.getElementById("profilePageName");

    if (!rootEl || !listEl || !tabLevelEl || !tabWealthEl || !tabCollectEl) {
        return;
    }

    // Если уже подписались — просто обновляем currentUid,
    // а следующее onSnapshot само перерисует.
    if (leaderboardSubscribed) {
        return;
    }
    leaderboardSubscribed = true;

    const tabs = [
        { el: tabLevelEl,   metric: "level",      baseLabel: "По уровню" },
        { el: tabWealthEl,  metric: "wealth",     baseLabel: "По богатству" },
        { el: tabCollectEl, metric: "collection", baseLabel: "По коллекции" },
    ];

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
        tabs.forEach((t) => {
            const isActive = t.metric === state.currentMetric;
            t.el.classList.toggle("active", isActive);
            t.el.textContent = isActive
                ? `(${t.baseLabel})`
                : t.baseLabel;
        });
    }

    function renderList() {
        const metric  = state.currentMetric;
        const dataset = getSorted(metric);

        listEl.innerHTML = "";

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

            listEl.appendChild(row);
        });
    }

    // обработчики вкладок (вешаем один раз)
    tabs.forEach((t) => {
        t.el.addEventListener("click", () => {
            if (state.currentMetric === t.metric) return;
            state.currentMetric = t.metric;
            updateTabs();
            renderList();
        });
    });

    // стартовые табы
    state.currentMetric = "level";
    updateTabs();

    // === Реалтайм-подписка на всех пользователей ===
    const colRef = collection(db, "users");
    unsubscribeLeaderboard = onSnapshot(
        colRef,
        (snap) => {
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

            if (!users.length) {
                state.byLevel = [];
                state.byWealth = [];
                state.byCollection = [];
                listEl.innerHTML = "";
                return;
            }

            // гарантируем наличие текущего игрока (на всякий случай)
            if (state.currentUid) {
                const found = users.some((u) => u.uid === state.currentUid);
                if (!found) {
                    users.push({
                        uid: state.currentUid,
                        name:    "Игрок",
                        level:   0,
                        balance: 0,
                        totalEarned: 0,
                        collectionValue: 0,
                        collectionCount: 0,
                    });
                }
            }

            // === сортировки ===

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

            // метка #n в имени по уровню
            if (nameEl && state.currentUid) {
                const meIndexByLevel = state.byLevel.findIndex(
                    (u) => u.uid === state.currentUid
                );
                const mePlaceByLevel =
                    meIndexByLevel >= 0 ? meIndexByLevel + 1 : null;

                const meUser =
                    state.byLevel.find((u) => u.uid === state.currentUid) ||
                    users[0];

                const tag = mePlaceByLevel ? ` #${mePlaceByLevel}` : "";
                nameEl.textContent = `${meUser.name}${tag}`;
            }

            // рендерим текущую метрику
            renderList();
        },
        (err) => {
            console.error("Ошибка подписки на рейтинг игроков", err);
        }
    );
}

/**
 * На будущее, если захочешь отписываться (например, при logout),
 * можно экспортировать эту функцию и вызывать её снаружи.
 */
export function disposeProfileLeaderboards() {
    if (unsubscribeLeaderboard) {
        unsubscribeLeaderboard();
        unsubscribeLeaderboard = null;
    }
    leaderboardSubscribed = false;
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
