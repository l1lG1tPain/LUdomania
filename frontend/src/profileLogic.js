// src/profileLogic.js
import { getLeagueForLevel, getLeagueLabel } from "./leagueLogic.js";

/**
 * Чистая логика вычисления "отображаемых" данных профиля
 * (можно переиспользовать для будущей страницы "Профиль")
 */
export function buildProfileViewModel(userData = {}, level = 0, balance = 0) {
    const name =
        userData.firstName ||
        userData.username ||
        userData.displayName ||
        "Игрок";

    const akulkaId = userData.akulkaId || "—";
    const photoUrl = userData.photoUrl || null;

    const league = getLeagueForLevel(level);

    return {
        name,
        akulkaId,
        photoUrl,
        level,
        balance,
        league,
        leagueLabel: getLeagueLabel(level),
    };
}

/**
 * Рендер заголовка (хедер сверху) из view-model
 * — отдельно от main.js, чтобы логика профиля жила в одном месте
 */
export function renderProfileHeader(viewModel) {
    const {
        name,
        akulkaId,
        photoUrl,
        level,
        balance,
    } = viewModel;

    const profileNameEl = document.getElementById("profileName");
    const profileIdEl   = document.getElementById("profileId");
    const avatarEl      = document.getElementById("profileAvatar");
    const headerBalanceEl = document.getElementById("headerBalance");
    const headerLevelEl   = document.getElementById("headerLevel");

    if (profileNameEl) profileNameEl.textContent = name;
    if (profileIdEl)   profileIdEl.textContent   = `AkulkaID: ${akulkaId}`;

    if (avatarEl) {
        avatarEl.innerHTML = "";
        const img = document.createElement("img");
        if (photoUrl) {
            img.src = photoUrl;
            img.alt = name;
        } else {
            // fallback — эмоджи Акулки
            img.alt = "Akulka";
            img.src =
                "https://dummyimage.com/80x80/111/fff.png&text=%F0%9F%A6%88"; // можно заменить на свой CDN позже
        }
        avatarEl.appendChild(img);
    }

    if (headerBalanceEl && typeof balance === "number") {
        headerBalanceEl.textContent = balance;
    }

    if (headerLevelEl && typeof level === "number") {
        headerLevelEl.textContent = level;
    }
}

/**
 * Удобная обёртка: из "сырых" данных и уровня
 * сразу обновляем хедер.
 */
export function renderProfileFromUserDoc(userDocData, level, balance) {
    const vm = buildProfileViewModel(userDocData, level, balance);
    renderProfileHeader(vm);
}
