// src/leaderboardLogic.js
import { db } from "./firebase.js";
import {
    collection,
    getDocs,
} from "firebase/firestore";

/**
 * Глобальный рейтинг игроков:
 *  - вкладки: по уровню / по богатству / по коллекции
 *  - показываем ВСЕХ игроков
 *  - по дефолту открыта вкладка "По уровню"
 *
 * @param {string} currentUid
 * @param {object} currentUserMetrics
 *   { name, level, balance, totalEarned, collectionValue, collectionCount }
 */
export async function initProfileLeaderboards(currentUid, currentUserMetrics = {}) {
    if (!currentUid) return;

    const rootEl        = document.getElementById("profileLeaderboard");
    const listEl        = document.getElementById("profileLeaderboardList");
    const tabLevelEl    = document.getElementById("leaderboardTabLevel");
    const tabWealthEl   = document.getElementById("leaderboardTabWealth");
    const tabCollectEl  = document.getElementById("leaderboardTabCollection");

    const nameEl        = document.getElementById("profilePageName");

    // Если на странице нет нужных элементов — выходим
    if (!rootEl || !listEl || !tabLevelEl || !tabWealthEl || !tabCollectEl) {
        return;
    }

    try {
        const snap = await getDocs(collection(db, "users"));
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

        if (!users.length) return;

        // гарантируем наличие текущего игрока
        let me = users.find((u) => u.uid === currentUid);
        if (!me) {
            me = {
                uid: currentUid,
                name:            currentUserMetrics.name ?? "Игрок",
                level:           currentUserMetrics.level           ?? 0,
                balance:         currentUserMetrics.balance         ?? 0,
                totalEarned:     currentUserMetrics.totalEarned     ?? 0,
                collectionValue: currentUserMetrics.collectionValue ?? 0,
                collectionCount: currentUserMetrics.collectionCount ?? 0,
            };
            users.push(me);
        }

        // === сортировки для трёх вкладок ===

        // по уровню (level -> totalEarned)
        const byLevel = [...users].sort((a, b) => {
            if (b.level !== a.level) return b.level - a.level;
            return (b.totalEarned ?? 0) - (a.totalEarned ?? 0);
        });

        // по богатству (balance -> totalEarned)
        const byWealth = [...users].sort((a, b) => {
            if (b.balance !== a.balance) return b.balance - a.balance;
            return (b.totalEarned ?? 0) - (a.totalEarned ?? 0);
        });

        // по коллекции (collectionValue -> collectionCount)
        const byCollection = [...users].sort((a, b) => {
            if (b.collectionValue !== a.collectionValue) {
                return b.collectionValue - a.collectionValue;
            }
            return (b.collectionCount ?? 0) - (a.collectionCount ?? 0);
        });

        // метка #n в имени по уровню
        const meIndexByLevel = byLevel.findIndex((u) => u.uid === currentUid);
        const mePlaceByLevel = meIndexByLevel >= 0 ? meIndexByLevel + 1 : null;

        if (nameEl) {
            const tag = mePlaceByLevel ? ` #${mePlaceByLevel}` : "";
            nameEl.textContent = `${me.name}${tag}`;
        }

        // ===== Вкладки и рендер =====

        const tabs = [
            { el: tabLevelEl,   metric: "level",      baseLabel: "По уровню" },
            { el: tabWealthEl,  metric: "wealth",     baseLabel: "По богатству" },
            { el: tabCollectEl, metric: "collection", baseLabel: "По коллекции" },
        ];

        let currentMetric = "level";

        function getSorted(metric) {
            if (metric === "wealth")     return byWealth;
            if (metric === "collection") return byCollection;
            return byLevel;
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
                const isActive = t.metric === currentMetric;
                t.el.classList.toggle("active", isActive);
                t.el.textContent = isActive
                    ? `(${t.baseLabel})`
                    : t.baseLabel;
            });
        }

        function renderList() {
            const metric  = currentMetric;
            const dataset = getSorted(metric);

            listEl.innerHTML = "";

            dataset.forEach((user, index) => {
                const row = document.createElement("div");
                row.className = "profile-leaderboard-row";
                if (user.uid === currentUid) {
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

        // обработчики вкладок
        tabs.forEach((t) => {
            t.el.addEventListener("click", () => {
                if (currentMetric === t.metric) return;
                currentMetric = t.metric;
                updateTabs();
                renderList();
            });
        });

        // старт: по уровню
        currentMetric = "level";
        updateTabs();
        renderList();
    } catch (err) {
        console.error("Ошибка загрузки рейтинга игроков", err);
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
