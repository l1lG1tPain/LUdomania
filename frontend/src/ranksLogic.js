// src/ranksLogic.js

/**
 * Базовые ранги по уровню игрока.
 */
export const RANKS_BY_LEVEL = [
    {
        id: "newbie",
        tier: 1,
        minLevel: 0,
        title: "Новобранец",
        emoji: "🐣",
        description: "Только входит во вкус лудомании.",
    },
    {
        id: "casual",
        tier: 2,
        minLevel: 5,
        title: "Лудо-любитель",
        emoji: "🎮",
        description: "Уже понимает, что клики — это жизнь.",
    },
    {
        id: "farmer",
        tier: 3,
        minLevel: 10,
        title: "Фарм-менеджер",
        emoji: "💼",
        description: "Считает клики и LM лучше, чем деньги в кошельке.",
    },
    {
        id: "risk_analyst",
        tier: 4,
        minLevel: 25,
        title: "Риск-аналитик",
        emoji: "🧠",
        description: "Винрейты, шансы и окупаемость уже не шутки.",
    },
    {
        id: "highroller",
        tier: 5,
        minLevel: 50,
        title: "Хайроллер",
        emoji: "🐯",
        description: "Любит риск, автоматы и красивые дропы.",
    },
    {
        id: "legend",
        tier: 6,
        minLevel: 75,
        title: "Лудо-легенда",
        emoji: "🐉",
        description: "О нём уже ходят легенды среди автоматов.",
    },
    {
        id: "megaludoman",
        tier: 7,
        minLevel: 100,
        title: "Мегалудоман",
        emoji: "🦈",
        description: "Живёт в автоматах, дышит LM и шаркится по коллекции.",
    },
];

/**
 * Ранги богатства — по totalEarned (сколько всего нафармил).
 */
export const WEALTH_RANKS = [
    {
        id: "poor",
        tier: 1,
        minTotalEarned: 0,
        title: "Начинающий фармер",
        emoji: "💸",
        description: "Пока больше опыта, чем ЛудоМани.",
    },
    {
        id: "steady",
        tier: 2,
        minTotalEarned: 5_000,
        title: "Стабильный фармер",
        emoji: "💰",
        description: "LM уже капает, а не капает слеза.",
    },
    {
        id: "stacker",
        tier: 3,
        minTotalEarned: 25_000,
        title: "Собирает стэки",
        emoji: "📦",
        description: "Знает толк в долгих сессиях.",
    },
    {
        id: "minter",
        tier: 4,
        minTotalEarned: 75_000,
        title: "Минтер монет",
        emoji: "🪙",
        description: "Печатает LM быстрее, чем автоматы успевают мигать.",
    },
    {
        id: "whale",
        tier: 5,
        minTotalEarned: 150_000,
        title: "Лудо-кит",
        emoji: "🐋",
        description: "Двигает рынок ЛудоМани.",
    },
    {
        id: "tycoon",
        tier: 6,
        minTotalEarned: 300_000,
        title: "Фарм-магнат",
        emoji: "🏦",
        description: "Уже мог бы открыть своё казино.",
    },
    {
        id: "shark_farmer",
        tier: 7,
        minTotalEarned: 500_000,
        title: "Богатый фармер",
        emoji: "💰🦈",
        description: "LM уже не влазит в инвентарь.",
    },
];

/**
 * Ранги коллекционера — по стоимости коллекции и количеству призов.
 */
export const COLLECTOR_RANKS = [
    {
        id: "collector_newbie",
        tier: 1,
        minValue: 0,
        minCount: 0,
        title: "Коллекционер-новичок",
        emoji: "🎴",
        description: "Делает первые шаги в витринах.",
    },
    {
        id: "collector_hobby",
        tier: 2,
        minValue: 5_000,
        minCount: 5,
        title: "Коллектор выходного дня",
        emoji: "🧸",
        description: "В витрине уже не одинокий плюшевый.",
    },
    {
        id: "collector_rare",
        tier: 3,
        minValue: 20_000,
        minCount: 15,
        title: "Охотник за редкостями",
        emoji: "💎",
        description: "Редкие призы знают его в лицо.",
    },
    {
        id: "collector_epic",
        tier: 4,
        minValue: 60_000,
        minCount: 30,
        title: "Куратор эпиков",
        emoji: "🏛️",
        description: "Собирает экспонаты музейного уровня.",
    },
    {
        id: "collector_myth",
        tier: 5,
        minValue: 120_000,
        minCount: 50,
        title: "Мифический коллекционер",
        emoji: "🐉",
        description: "Никто не верит, пока не увидит витрину.",
    },
    {
        id: "collector_elite",
        tier: 6,
        minValue: 250_000,
        minCount: 80,
        title: "Коллекционер эпохи",
        emoji: "🎴👑",
        description: "Каждый приз — часть легенды.",
    },
    {
        id: "collector_shark",
        tier: 7,
        minValue: 400_000,
        minCount: 120,
        title: "Лудо-куратор",
        emoji: "🦈🎁",
        description: "Управляет экспозицией целой Лудо-вселенной.",
    },
];

/** Общий ранг по уровню */
export function getRankForProfile(metrics = {}) {
    const level = Number.isFinite(metrics.level) ? metrics.level : 0;
    let current = RANKS_BY_LEVEL[0];

    for (const rank of RANKS_BY_LEVEL) {
        if (level >= rank.minLevel) {
            current = rank;
        } else break;
    }
    return current;
}

/** Ранг богатства */
export function getWealthRank(metrics = {}) {
    const totalEarned = Number.isFinite(metrics.totalEarned) ? metrics.totalEarned : 0;
    let current = WEALTH_RANKS[0];

    for (const rank of WEALTH_RANKS) {
        if (totalEarned >= rank.minTotalEarned) {
            current = rank;
        } else break;
    }
    return current;
}

/** Ранг коллекционера */
export function getCollectorRank(metrics = {}) {
    const totalValue = Number.isFinite(metrics.totalCollectionValue)
        ? metrics.totalCollectionValue
        : 0;
    const totalCount = Number.isFinite(metrics.totalPrizesCount)
        ? metrics.totalPrizesCount
        : 0;

    let current = COLLECTOR_RANKS[0];

    for (const rank of COLLECTOR_RANKS) {
        if (totalValue >= rank.minValue && totalCount >= rank.minCount) {
            current = rank;
        } else break;
    }
    return current;
}

/** Подсчёт позиции #n по tier (типа псевдо-лидерборд) */
export function getPlaceFromTier(tier, ranksArray) {
    const maxTier = ranksArray.reduce(
        (max, r) => (r.tier > max ? r.tier : max),
        1
    );
    const safeTier = tier || 1;
    const place = maxTier + 1 - safeTier; // tier=7 → #1, tier=1 → #7
    return { place, maxTier };
}
