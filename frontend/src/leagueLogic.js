// src/leagueLogic.js

// Границы лиг по уровню
// можно потом легко менять / добавлять новые
export const LEAGUES = [
    {
        id: "bronze",
        name: "Бронза",
        emoji: "🥉",
        minLevel: 0,
        maxLevel: 9,
    },
    {
        id: "silver",
        name: "Серебро",
        emoji: "🥈",
        minLevel: 10,
        maxLevel: 24,
    },
    {
        id: "gold",
        name: "Золото",
        emoji: "🥇",
        minLevel: 25,
        maxLevel: 49,
    },
    {
        id: "platinum",
        name: "Платина",
        emoji: "💠",
        minLevel: 50,
        maxLevel: 99,
    },
    {
        id: "diamond",
        name: "Алмаз",
        emoji: "💎",
        minLevel: 100,
        maxLevel: Infinity,
    },
];

/**
 * Возвращает объект лиги по уровню
 */
export function getLeagueForLevel(level = 0) {
    const lvl = Number.isFinite(level) ? level : 0;
    let result = LEAGUES[0];

    for (const league of LEAGUES) {
        if (lvl >= league.minLevel && lvl <= league.maxLevel) {
            result = league;
            break;
        }
    }
    return result;
}

/**
 * Короткий текст для UI: "🥉 Бронза"
 */
export function getLeagueLabel(level) {
    const league = getLeagueForLevel(level);
    return `${league.emoji} ${league.name}`;
}

/**
 * Прогресс внутри текущей лиги (0..1)
 * Можно использовать для отдельного прогресс-бара лиги.
 */
export function getLeagueProgress(level) {
    const league = getLeagueForLevel(level);
    const nextLeague = LEAGUES.find(l => l.minLevel > league.minLevel);

    if (!nextLeague) {
        // последняя лига — всегда 1
        return { league, progress: 1, nextLeague: null };
    }

    const span = nextLeague.minLevel - league.minLevel;
    const offset = Math.max(0, level - league.minLevel);
    const progress = Math.max(0, Math.min(1, offset / span));

    return { league, progress, nextLeague };
}
