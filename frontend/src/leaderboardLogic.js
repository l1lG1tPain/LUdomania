// src/leaderboardLogic.js
import { db } from "./firebase.js";
import {
    collection,
    getDocs,
} from "firebase/firestore";

/**
 * Загружаем всех пользователей и считаем место текущего игрока
 * по трём метрикам:
 *  - уровень (level)
 *  - богатство (balance / текущие LM на руках)
 *  - коллекция (collectionValue / общая стоимость коллекции)
 *
 * @param {string} currentUid
 * @param {object} currentUserMetrics - метрики текущего пользователя
 *   { name, level, balance, totalEarned, collectionValue, collectionCount }
 */
export async function initProfileLeaderboards(currentUid, currentUserMetrics = {}) {
    if (!currentUid) return;

    const levelValueEl      = document.getElementById("profileRankingLevelValue");
    const levelPlaceEl      = document.getElementById("profileRankingLevelPlace");
    const wealthValueEl     = document.getElementById("profileRankingWealthValue");
    const wealthPlaceEl     = document.getElementById("profileRankingWealthPlace");
    const collectionValueEl = document.getElementById("profileRankingCollectionValue");
    const collectionPlaceEl = document.getElementById("profileRankingCollectionPlace");

    const nameEl            = document.getElementById("profilePageName");

    // если на странице нет блока рейтинга — тихо выходим
    if (
        !levelValueEl ||
        !levelPlaceEl ||
        !wealthValueEl ||
        !wealthPlaceEl ||
        !collectionValueEl ||
        !collectionPlaceEl
    ) {
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

        const me     = users.find((u) => u.uid === currentUid);
        const meName = me?.name ?? currentUserMetrics.name ?? "Игрок";

        // ===== Рейтинг по уровню =====
        const byLevel = [...users].sort((a, b) => {
            if (b.level !== a.level) return b.level - a.level;
            // если уровни равны — сортируем по общему заработку
            return (b.totalEarned ?? 0) - (a.totalEarned ?? 0);
        });

        const levelIndex = byLevel.findIndex((u) => u.uid === currentUid);
        const levelPlace = levelIndex >= 0 ? levelIndex + 1 : null;
        const myLevel    = me?.level ?? currentUserMetrics.level ?? 0;

        levelValueEl.textContent = `LVL ${myLevel}`;
        if (levelPlace) {
            levelPlaceEl.textContent = `#${levelPlace}`;
        } else {
            levelPlaceEl.textContent = "—";
        }

        // Обновляем имя в профиле с #местом по уровню
        if (nameEl) {
            const tag = levelPlace ? ` #${levelPlace}` : "";
            nameEl.textContent = `${meName}${tag}`;
        }

        // ===== Рейтинг по богатству (LM на руках) =====
        const byWealth = [...users].sort((a, b) => {
            if (b.balance !== a.balance) return b.balance - a.balance;
            return (b.totalEarned ?? 0) - (a.totalEarned ?? 0);
        });

        const wealthIndex = byWealth.findIndex((u) => u.uid === currentUid);
        const wealthPlace = wealthIndex >= 0 ? wealthIndex + 1 : null;
        const myBalance   = me?.balance ?? currentUserMetrics.balance ?? 0;

        wealthValueEl.textContent = formatNumberWithLM(myBalance);
        if (wealthPlace) {
            wealthPlaceEl.textContent = `#${wealthPlace}`;
        } else {
            wealthPlaceEl.textContent = "—";
        }

        // ===== Рейтинг по коллекции =====
        const byCollection = [...users].sort((a, b) => {
            if (b.collectionValue !== a.collectionValue) {
                return b.collectionValue - a.collectionValue;
            }
            return (b.collectionCount ?? 0) - (a.collectionCount ?? 0);
        });

        const collectionIndex = byCollection.findIndex((u) => u.uid === currentUid);
        const collectionPlace = collectionIndex >= 0 ? collectionIndex + 1 : null;
        const myCollectionValue =
            me?.collectionValue ?? currentUserMetrics.collectionValue ?? 0;

        collectionValueEl.textContent = formatNumberWithLM(myCollectionValue);
        if (collectionPlace) {
            collectionPlaceEl.textContent = `#${collectionPlace}`;
        } else {
            collectionPlaceEl.textContent = "—";
        }
    } catch (err) {
        console.error("Ошибка загрузки рейтинга игроков", err);
    }
}

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
