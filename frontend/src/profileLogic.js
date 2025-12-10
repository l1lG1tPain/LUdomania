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

// =======================
// Вспомогательные функции
// =======================

function formatNumber(num) {
    return Number(num || 0).toLocaleString("ru-RU");
}

// =======================
// Кэш DOM-элементов
// =======================

const domHeader = {
    nameEl: null,
    idEl: null,
    avatarEl: null,
};

const domPage = {
    avatarEl: null,
    nameEl: null,
    akulkaIdEl: null,
    balanceEl: null,
    levelEl: null,
    leagueEl: null,
    leagueFillEl: null,
    leagueTextEl: null,
    totalClicksEl: null,
    clickPowerEl: null,
    totalEarnedEl: null,
    totalSpentEl: null,

    ratingLevelValueEl: null,
    ratingLeagueChipEl: null,
    ratingLevelRankTitleEl: null,
    ratingTotalEarnedEl: null,
    ratingCurrentBalanceEl: null,
    wealthRankChipEl: null,
    ratingCollectionValueEl: null,
    ratingCollectionCountEl: null,
    collectorRankChipEl: null,

    rankingOverallEl: null,
    rankingOverallPlaceEl: null,
    rankingWealthEl: null,
    rankingWealthPlaceEl: null,
    rankingCollectorEl: null,
    rankingCollectorPlaceEl: null,
};

const domCollection = {
    mainEl: null,
    ratingEl: null,
    countEl: null,
    chipEl: null,
    rankingEl: null,
    rankingPlaceEl: null,
};

const domGameStats = {
    myGamesEl: null,
    myWinrateEl: null,
    globalGamesEl: null,
    globalWinsEl: null,
    globalRateHint: null,
};

function ensureHeaderDom() {
    if (!domHeader.nameEl) {
        domHeader.nameEl   = document.getElementById("profileName");
        domHeader.idEl     = document.getElementById("profileId");
        domHeader.avatarEl = document.getElementById("profileAvatar");
    }
}

function ensurePageDom() {
    if (!domPage.avatarEl) {
        domPage.avatarEl         = document.getElementById("profilePageAvatar");
        domPage.nameEl           = document.getElementById("profilePageName");
        domPage.akulkaIdEl       = document.getElementById("profilePageAkulkaId");
        domPage.balanceEl        = document.getElementById("profilePageBalance");
        domPage.levelEl          = document.getElementById("profilePageLevel");
        domPage.leagueEl         = document.getElementById("profilePageLeague");
        domPage.leagueFillEl     = document.getElementById("profileLeagueProgressFill");
        domPage.leagueTextEl     = document.getElementById("profileLeagueProgressText");
        domPage.totalClicksEl    = document.getElementById("profilePageTotalClicks");
        domPage.clickPowerEl     = document.getElementById("profilePageClickPower");
        domPage.totalEarnedEl    = document.getElementById("profilePageTotalEarned");
        domPage.totalSpentEl     = document.getElementById("profilePageTotalSpent");

        domPage.ratingLevelValueEl      = document.getElementById("profileRatingLevelValue");
        domPage.ratingLeagueChipEl      = document.getElementById("profileRatingLeagueChip");
        domPage.ratingLevelRankTitleEl  = document.getElementById("profileRankTitle");
        domPage.ratingTotalEarnedEl     = document.getElementById("profileRatingTotalEarned");
        domPage.ratingCurrentBalanceEl  = document.getElementById("profileRatingCurrentBalance");
        domPage.wealthRankChipEl        = document.getElementById("profileWealthRankChip");
        domPage.ratingCollectionValueEl = document.getElementById("profileRatingCollectionValue");
        domPage.ratingCollectionCountEl = document.getElementById("profileRatingCollectionCount");
        domPage.collectorRankChipEl     = document.getElementById("profileCollectorRankChip");

        domPage.rankingOverallEl        = document.getElementById("profileRankingOverall");
        domPage.rankingOverallPlaceEl   = document.getElementById("profileRankingOverallPlace");
        domPage.rankingWealthEl         = document.getElementById("profileRankingWealth");
        domPage.rankingWealthPlaceEl    = document.getElementById("profileRankingWealthPlace");
        domPage.rankingCollectorEl      = document.getElementById("profileRankingCollector");
        domPage.rankingCollectorPlaceEl = document.getElementById("profileRankingCollectorPlace");
    }
}

function ensureCollectionDom() {
    if (!domCollection.mainEl) {
        domCollection.mainEl        = document.getElementById("profileCollectionValue");
        domCollection.ratingEl      = document.getElementById("profileRatingCollectionValue");
        domCollection.countEl       = document.getElementById("profileRatingCollectionCount");
        domCollection.chipEl        = document.getElementById("profileCollectorRankChip");
        domCollection.rankingEl     = document.getElementById("profileRankingCollector");
        domCollection.rankingPlaceEl= document.getElementById("profileRankingCollectorPlace");
    }
}

function ensureGameStatsDom() {
    if (!domGameStats.myGamesEl) {
        domGameStats.myGamesEl      = document.getElementById("profileMyGames");
        domGameStats.myWinrateEl    = document.getElementById("profileMyWinrate");
        domGameStats.globalGamesEl  = document.getElementById("profileGlobalGames");
        domGameStats.globalWinsEl   = document.getElementById("profileGlobalWins");
        domGameStats.globalRateHint = document.getElementById("profileGlobalWinrateHint");
    }
}

// =======================
// ViewModel профиля
// =======================

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

// =======================
// Рендер шапки профиля
// =======================

export function renderProfileHeader(viewModel) {
    const { name, akulkaId, photoUrl } = viewModel;

    ensureHeaderDom();
    const { nameEl, idEl, avatarEl } = domHeader;

    if (nameEl) nameEl.textContent = name;
    if (idEl)   idEl.textContent   = `AkulkaID: ${akulkaId}`;

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

// =======================
// Рендер страницы профиля
// =======================

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

    ensurePageDom();
    const d = domPage;

    if (d.avatarEl) {
        d.avatarEl.innerHTML = "";
        const img = document.createElement("img");
        if (photoUrl) {
            img.src = photoUrl;
            img.alt = name;
        } else {
            img.alt = "Akulka";
            img.src =
                "https://dummyimage.com/120x120/111/fff.png&text=%F0%9F%A6%88";
        }
        d.avatarEl.appendChild(img);
    }

    const levelRank = getRankForProfile({ level, totalEarned });
    const { place: levelPlace } = getPlaceFromTier(levelRank.tier, RANKS_BY_LEVEL);

    if (d.nameEl) {
        const tag = levelPlace ? ` #${levelPlace}` : "";
        d.nameEl.textContent = `${name}${tag}`;
    }
    if (d.akulkaIdEl) {
        d.akulkaIdEl.textContent = `AkulkaID: ${akulkaId}`;
    }

    if (d.balanceEl) d.balanceEl.textContent = formatNumber(balance);
    if (d.levelEl)   d.levelEl.textContent   = level;
    if (d.leagueEl && league) {
        d.leagueEl.textContent = `${league.emoji} ${league.name}`;
    }

    const lp       = leagueProgress || getLeagueProgress(level || 0);
    const progress = Math.max(0, Math.min(1, lp.progress ?? 0));
    const percent  = Math.round(progress * 100);

    if (d.leagueFillEl) {
        d.leagueFillEl.style.width = `${percent}%`;
    }
    if (d.leagueTextEl) {
        if (lp.nextLeague) {
            d.leagueTextEl.textContent =
                `До лиги ${lp.nextLeague.emoji} ${lp.nextLeague.name}: ${percent}%`;
        } else {
            d.leagueTextEl.textContent = "Максимальная лига 🎉";
        }
    }

    // Рейтинг по уровню / лиге
    if (d.ratingLevelValueEl) d.ratingLevelValueEl.textContent = level;
    if (d.ratingLeagueChipEl && league) {
        d.ratingLeagueChipEl.textContent = `${league.emoji} ${league.name}`;
    }
    if (d.ratingLevelRankTitleEl && levelRank) {
        d.ratingLevelRankTitleEl.textContent = `${levelRank.emoji} ${levelRank.title}`;
        d.ratingLevelRankTitleEl.title       = levelRank.description;
    }

    // Деньги (богатство)
    if (d.ratingTotalEarnedEl) {
        d.ratingTotalEarnedEl.textContent = formatNumber(totalEarned);
    }
    if (d.ratingCurrentBalanceEl) {
        d.ratingCurrentBalanceEl.textContent = formatNumber(balance);
    }

    const wealthRank = getWealthRank({ totalEarned, balance });
    const { place: wealthPlace } = getPlaceFromTier(wealthRank.tier, WEALTH_RANKS);

    if (d.wealthRankChipEl && wealthRank) {
        d.wealthRankChipEl.textContent = `${wealthRank.emoji} ${wealthRank.title}`;
        d.wealthRankChipEl.title       = wealthRank.description;
    }

    // Блок "Рейтинг игрока" под винрейтом
    if (d.rankingOverallEl && levelRank) {
        d.rankingOverallEl.textContent = `${levelRank.emoji} ${levelRank.title}`;
    }
    if (d.rankingOverallPlaceEl && levelPlace) {
        d.rankingOverallPlaceEl.textContent = `#${levelPlace}`;
    }

    if (d.rankingWealthEl && wealthRank) {
        d.rankingWealthEl.textContent = `${wealthRank.emoji} ${wealthRank.title}`;
    }
    if (d.rankingWealthPlaceEl && wealthPlace) {
        d.rankingWealthPlaceEl.textContent = `#${wealthPlace}`;
    }

    // Базовые статы
    if (d.totalClicksEl) d.totalClicksEl.textContent = formatNumber(totalClicks);
    if (d.clickPowerEl)  d.clickPowerEl.textContent  = clickPower;
    if (d.totalEarnedEl) d.totalEarnedEl.textContent = formatNumber(totalEarned);
    if (d.totalSpentEl)  d.totalSpentEl.textContent  = formatNumber(totalSpent);
}

// =======================
// Коллекция / ачивки
// =======================

export function updateProfileCollectionValue(totalCollectionLM = 0, totalPrizesCount = 0) {
    ensureCollectionDom();
    const d = domCollection;

    const formattedValue = formatNumber(totalCollectionLM);
    const formattedCount = formatNumber(totalPrizesCount);

    if (d.mainEl)   d.mainEl.textContent   = formattedValue;
    if (d.ratingEl) d.ratingEl.textContent = formattedValue;
    if (d.countEl)  d.countEl.textContent  = formattedCount;

    try {
        const collectorRank = getCollectorRank({
            totalCollectionValue: totalCollectionLM,
            totalPrizesCount,
        });
        const { place: collectorPlace } = getPlaceFromTier(
            collectorRank.tier,
            COLLECTOR_RANKS
        );

        if (d.chipEl && collectorRank) {
            d.chipEl.textContent = `${collectorRank.emoji} ${collectorRank.title}`;
            d.chipEl.title       = collectorRank.description;
        }
        if (d.rankingEl && collectorRank) {
            d.rankingEl.textContent = `${collectorRank.emoji} ${collectorRank.title}`;
        }
        if (d.rankingPlaceEl && collectorPlace) {
            d.rankingPlaceEl.textContent = `#${collectorPlace}`;
        }
    } catch (e) {
        console.error("Ошибка расчёта ранга коллекционера", e);
    }
}

// =======================
// Статы по автоматам
// =======================

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

    ensureGameStatsDom();
    const d = domGameStats;

    if (d.myGamesEl)   d.myGamesEl.textContent   = formatNumber(myGames);
    if (d.myWinrateEl) d.myWinrateEl.textContent = `${myWinrate.toFixed(0)}%`;

    if (d.globalGamesEl) d.globalGamesEl.textContent = formatNumber(globalGames);
    if (d.globalWinsEl)  d.globalWinsEl.textContent  = formatNumber(globalWins);

    if (d.globalRateHint) {
        d.globalRateHint.textContent = `Глобальный винрейт: ${globalWinrate.toFixed(0)}%`;
    }
}

// =======================
// Обёртка для main.js
// =======================

export function renderProfileFromUserDoc(userDocData, level, balance) {
    const vm = buildProfileViewModel(userDocData, level, balance);
    renderProfileHeader(vm);
    renderProfilePageBase(vm);
}
