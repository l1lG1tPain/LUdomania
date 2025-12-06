// src/profileLogic.js
import {
    getLeagueForLevel,
    getLeagueLabel,
    getLeagueProgress,
} from "./leagueLogic.js";

import {
    getRankForProfile,
    RANKS_BY_LEVEL,
    getWealthRank,
    WEALTH_RANKS,
    getCollectorRank,
    COLLECTOR_RANKS,
    getPlaceFromTier,
} from "./ranksLogic.js";

/**
 * Собираем view-model профиля из документа пользователя + уровня и баланса.
 */
export function buildProfileViewModel(userData = {}, level = 0, balance = 0) {
    const name =
        userData.firstName ||
        userData.username ||
        userData.displayName ||
        "Игрок";

    const akulkaId    = userData.akulkaId    || "—";
    const photoUrl    = userData.photoUrl    || null;
    const totalClicks = userData.totalClicks ?? 0;
    const totalEarned = userData.totalEarned ?? 0;
    const totalSpent  = userData.totalSpent  ?? 0;
    const clickPower  = userData.clickPower  ?? 1;

    const league         = getLeagueForLevel(level);
    const leagueLabel    = getLeagueLabel(level);
    const leagueProgress = getLeagueProgress(level);

    return {
        name,
        akulkaId,
        photoUrl,
        level,
        balance,
        totalClicks,
        totalEarned,
        totalSpent,
        clickPower,
        league,
        leagueLabel,
        leagueProgress,
    };
}

/**
 * Рендерим только шапку (аватар + имя + AkulkaID).
 * Баланс/уровень в хедере рисуются в main.js через formatLM.
 */
export function renderProfileHeader(viewModel) {
    const {
        name,
        akulkaId,
        photoUrl,
    } = viewModel;

    const profileNameEl = document.getElementById("profileName");
    const profileIdEl   = document.getElementById("profileId");
    const avatarEl      = document.getElementById("profileAvatar");

    if (profileNameEl) profileNameEl.textContent = name;
    if (profileIdEl)   profileIdEl.textContent   = `AkulkaID: ${akulkaId}`;

    if (avatarEl) {
        avatarEl.innerHTML = "";
        const img = document.createElement("img");

        if (photoUrl) {
            img.src = photoUrl;
            img.alt = name;
        } else {
            img.alt = "Akulka";
            img.src =
                "https://dummyimage.com/80x80/111/fff.png&text=%F0%9F%A6%88";
        }

        avatarEl.appendChild(img);
    }
}

/**
 * Базовая часть страницы профиля (pageProfile):
 * аватар, имя, AkulkaID, уровень, лига, баланс, базовые счётчики и рейтинги.
 */
export function renderProfilePageBase(viewModel) {
    const {
        name,
        akulkaId,
        photoUrl,
        level,
        balance,
        totalClicks,
        totalEarned,
        totalSpent,
        clickPower,
        league,
        leagueProgress,
    } = viewModel;

    const avatarEl          = document.getElementById("profilePageAvatar");
    const nameEl            = document.getElementById("profilePageName");
    const akulkaIdEl        = document.getElementById("profilePageAkulkaId");
    const balanceEl         = document.getElementById("profilePageBalance");
    const levelEl           = document.getElementById("profilePageLevel");
    const leagueEl          = document.getElementById("profilePageLeague");
    const leagueFillEl      = document.getElementById("profileLeagueProgressFill");
    const leagueTextEl      = document.getElementById("profileLeagueProgressText");
    const totalClicksEl     = document.getElementById("profilePageTotalClicks");
    const clickPowerEl      = document.getElementById("profilePageClickPower");
    const totalEarnedEl     = document.getElementById("profilePageTotalEarned");
    const totalSpentEl      = document.getElementById("profilePageTotalSpent");

    // Элементы рейтинга в основной карточке
    const ratingLevelValueEl       = document.getElementById("profileRatingLevelValue");
    const ratingLeagueChipEl       = document.getElementById("profileRatingLeagueChip");
    const ratingLevelRankTitleEl   = document.getElementById("profileRankTitle");
    const ratingTotalEarnedEl      = document.getElementById("profileRatingTotalEarned");
    const ratingCurrentBalanceEl   = document.getElementById("profileRatingCurrentBalance");
    const wealthRankChipEl         = document.getElementById("profileWealthRankChip");
    const ratingCollectionValueEl  = document.getElementById("profileRatingCollectionValue");
    const ratingCollectionCountEl  = document.getElementById("profileRatingCollectionCount");
    const collectorRankChipEl      = document.getElementById("profileCollectorRankChip");

    // Элементы "Рейтинг игрока" под глобальным винрейтом
    const rankingOverallEl         = document.getElementById("profileRankingOverall");
    const rankingOverallPlaceEl    = document.getElementById("profileRankingOverallPlace");
    const rankingWealthEl          = document.getElementById("profileRankingWealth");
    const rankingWealthPlaceEl     = document.getElementById("profileRankingWealthPlace");
    const rankingCollectorEl       = document.getElementById("profileRankingCollector");
    const rankingCollectorPlaceEl  = document.getElementById("profileRankingCollectorPlace");

    if (avatarEl) {
        avatarEl.innerHTML = "";
        const img = document.createElement("img");
        if (photoUrl) {
            img.src = photoUrl;
            img.alt = name;
        } else {
            img.alt = "Akulka";
            img.src =
                "https://dummyimage.com/120x120/111/fff.png&text=%F0%9F%A6%88";
        }
        avatarEl.appendChild(img);
    }

    // 🏅 Ранг по уровню (общий)
    const levelRank = getRankForProfile({ level, totalEarned });
    const { place: levelPlace } = getPlaceFromTier(levelRank.tier, RANKS_BY_LEVEL);

    if (nameEl) {
        const tag = levelPlace ? ` #${levelPlace}` : "";
        nameEl.textContent = `${name}${tag}`;
    }
    if (akulkaIdEl) {
        akulkaIdEl.textContent = `AkulkaID: ${akulkaId}`;
    }

    if (typeof balance === "number" && balanceEl) {
        balanceEl.textContent = balance.toLocaleString("ru-RU");
    }
    if (typeof level === "number" && levelEl) {
        levelEl.textContent = level;
    }
    if (leagueEl && league) {
        leagueEl.textContent = `${league.emoji} ${league.name}`;
    }

    // Прогресс лиги
    const lp = leagueProgress || getLeagueProgress(level || 0);
    const progress = Math.max(0, Math.min(1, lp.progress ?? 0));
    const percent  = Math.round(progress * 100);

    if (leagueFillEl) {
        leagueFillEl.style.width = `${percent}%`;
    }
    if (leagueTextEl) {
        if (lp.nextLeague) {
            leagueTextEl.textContent =
                `До лиги ${lp.nextLeague.emoji} ${lp.nextLeague.name}: ${percent}%`;
        } else {
            leagueTextEl.textContent = "Максимальная лига 🎉";
        }
    }

    // 🔹 Рейтинг по уровню и лиге (в карточке)
    if (ratingLevelValueEl && typeof level === "number") {
        ratingLevelValueEl.textContent = level;
    }
    if (ratingLeagueChipEl && league) {
        ratingLeagueChipEl.textContent = `${league.emoji} ${league.name}`;
    }
    if (ratingLevelRankTitleEl && levelRank) {
        ratingLevelRankTitleEl.textContent = `${levelRank.emoji} ${levelRank.title}`;
        ratingLevelRankTitleEl.title       = levelRank.description;
    }

    // 🔹 Рейтинг по деньгам (богатство)
    if (ratingTotalEarnedEl) {
        ratingTotalEarnedEl.textContent = totalEarned.toLocaleString("ru-RU");
    }
    if (ratingCurrentBalanceEl && typeof balance === "number") {
        ratingCurrentBalanceEl.textContent = balance.toLocaleString("ru-RU");
    }

    const wealthRank = getWealthRank({ totalEarned, balance });
    const { place: wealthPlace } = getPlaceFromTier(wealthRank.tier, WEALTH_RANKS);

    if (wealthRankChipEl && wealthRank) {
        wealthRankChipEl.textContent = `${wealthRank.emoji} ${wealthRank.title}`;
        wealthRankChipEl.title       = wealthRank.description;
    }

    // 🔹 Заполняем блок "Рейтинг игрока" под винрейтом
    if (rankingOverallEl && levelRank) {
        rankingOverallEl.textContent = `${levelRank.emoji} ${levelRank.title}`;
    }
    if (rankingOverallPlaceEl && levelPlace) {
        rankingOverallPlaceEl.textContent = `#${levelPlace}`;
    }

    if (rankingWealthEl && wealthRank) {
        rankingWealthEl.textContent = `${wealthRank.emoji} ${wealthRank.title}`;
    }
    if (rankingWealthPlaceEl && wealthPlace) {
        rankingWealthPlaceEl.textContent = `#${wealthPlace}`;
    }

    // стандартные статы
    if (totalClicksEl) totalClicksEl.textContent = totalClicks.toLocaleString("ru-RU");
    if (clickPowerEl)  clickPowerEl.textContent  = clickPower;
    if (totalEarnedEl) totalEarnedEl.textContent = totalEarned.toLocaleString("ru-RU");
    if (totalSpentEl)  totalSpentEl.textContent  = totalSpent.toLocaleString("ru-RU");
}

/**
 * Обновляем стоимость коллекции (учитывает все копии призов)
 * + в рейтинге коллекции и блоке "Рейтинг игрока".
 */
export function updateProfileCollectionValue(totalCollectionLM = 0, totalPrizesCount = 0) {
    const mainEl   = document.getElementById("profileCollectionValue");
    const ratingEl = document.getElementById("profileRatingCollectionValue");
    const countEl  = document.getElementById("profileRatingCollectionCount");

    const chipEl          = document.getElementById("profileCollectorRankChip");
    const rankingEl       = document.getElementById("profileRankingCollector");
    const rankingPlaceEl  = document.getElementById("profileRankingCollectorPlace");

    const formattedValue = totalCollectionLM.toLocaleString("ru-RU");
    const formattedCount = totalPrizesCount.toLocaleString("ru-RU");

    if (mainEl)   mainEl.textContent   = formattedValue;
    if (ratingEl) ratingEl.textContent = formattedValue;
    if (countEl)  countEl.textContent  = formattedCount;

    // ранги коллекционера
    try {
        const collectorRank = getCollectorRank({
            totalCollectionValue: totalCollectionLM,
            totalPrizesCount,
        });
        const { place: collectorPlace } = getPlaceFromTier(
            collectorRank.tier,
            COLLECTOR_RANKS
        );

        if (chipEl && collectorRank) {
            chipEl.textContent = `${collectorRank.emoji} ${collectorRank.title}`;
            chipEl.title       = collectorRank.description;
        }
        if (rankingEl && collectorRank) {
            rankingEl.textContent = `${collectorRank.emoji} ${collectorRank.title}`;
        }
        if (rankingPlaceEl && collectorPlace) {
            rankingPlaceEl.textContent = `#${collectorPlace}`;
        }
    } catch (e) {
        console.error("Ошибка расчёта ранга коллекционера", e);
    }
}

/**
 * Обновляем агрегированную статистику по автоматам:
 * мои игры / винрейт / глобальные игры / глобальные победы.
 */
export function updateProfileGameStats(stats) {
    if (!stats) return;

    const {
        myGames = 0,
        myWins = 0,
        myWinrate = 0,
        globalGames = 0,
        globalWins = 0,
        globalWinrate = 0,
    } = stats;

    const myGamesEl      = document.getElementById("profileMyGames");
    const myWinrateEl    = document.getElementById("profileMyWinrate");
    const globalGamesEl  = document.getElementById("profileGlobalGames");
    const globalWinsEl   = document.getElementById("profileGlobalWins");
    const globalRateHint = document.getElementById("profileGlobalWinrateHint");

    if (myGamesEl)   myGamesEl.textContent   = myGames.toLocaleString("ru-RU");
    if (myWinrateEl) myWinrateEl.textContent = `${myWinrate.toFixed(0)}%`;

    if (globalGamesEl) globalGamesEl.textContent = globalGames.toLocaleString("ru-RU");
    if (globalWinsEl)  globalWinsEl.textContent  = globalWins.toLocaleString("ru-RU");

    if (globalRateHint) {
        globalRateHint.textContent = `Глобальный винрейт: ${globalWinrate.toFixed(0)}%`;
    }
}

/**
 * Удобная обёртка: из "сырых" данных и уровня
 * сразу обновляем шапку + базовую часть страницы профиля.
 */
export function renderProfileFromUserDoc(userDocData, level, balance) {
    const vm = buildProfileViewModel(userDocData, level, balance);
    renderProfileHeader(vm);
    renderProfilePageBase(vm);
}
