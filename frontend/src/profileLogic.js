// src/profileLogic.js
import {
    getLeagueForLevel,
    getLeagueLabel,
    getLeagueProgress,
} from "./leagueLogic.js";

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
 * аватар, имя, AkulkaID, уровень, лига, баланс и базовые счётчики.
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

    if (nameEl)      nameEl.textContent      = name;
    if (akulkaIdEl)  akulkaIdEl.textContent  = `AkulkaID: ${akulkaId}`;

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

    if (typeof balance === "number" && balanceEl) {
        balanceEl.textContent = balance.toLocaleString("ru-RU");
    }
    if (typeof level === "number" && levelEl) {
        levelEl.textContent = level;
    }
    if (leagueEl && league) {
        leagueEl.textContent = `${league.emoji} ${league.name}`;
    }

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

    if (totalClicksEl) totalClicksEl.textContent = totalClicks.toLocaleString("ru-RU");
    if (clickPowerEl)  clickPowerEl.textContent  = clickPower;
    if (totalEarnedEl) totalEarnedEl.textContent = totalEarned.toLocaleString("ru-RU");
    if (totalSpentEl)  totalSpentEl.textContent  = totalSpent.toLocaleString("ru-RU");
}

/**
 * Обновляем стоимость коллекции (учитывает все копии призов).
 */
export function updateProfileCollectionValue(totalCollectionLM = 0) {
    const el = document.getElementById("profileCollectionValue");
    if (!el) return;
    el.textContent = totalCollectionLM.toLocaleString("ru-RU");
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
