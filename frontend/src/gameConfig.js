// frontend/src/gameConfig.js

// ==========================================
// 🎚 УРОВНИ
// ==========================================

/**
 * Клики, нужные для перехода с уровня N на N+1.
 * 0→1: 500, 1→2: 1000, 2→3: 1500, ...
 */
export function getRequiredClicksForLevel(level) {
    return 500 * (level + 1);
}

/**
 * Считает уровень по общему количеству кликов.
 * Возвращает { level, current, required, progress }.
 */
export function calculateLevelState(totalClicks = 0) {
    let level = 0;
    let remaining = totalClicks;

    while (true) {
        const need = getRequiredClicksForLevel(level);
        if (remaining < need) break;
        remaining -= need;
        level++;
    }

    const required = getRequiredClicksForLevel(level);
    const current  = remaining;
    const progress = required > 0 ? current / required : 0;

    return { level, current, required, progress };
}

// ==========================================
// ⭐ РЕДКОСТИ
// ==========================================

export const RARITY_META = {
    common: {
        id: "common",
        label: "Обычный",
        color: "#b0bec5",
    },
    rare: {
        id: "rare",
        label: "Редкий",
        color: "#64b5f6",
    },
    epic: {
        id: "epic",
        label: "Эпический",
        color: "#ba68c8",
    },
    legendary: {
        id: "legendary",
        label: "Легендарный",
        color: "#ffca28",
    },
};

// ==========================================
// 🎁 ПРИЗЫ
// collectionId — к какой коллекции относится
// value — базовая цена продажи
// maxCopiesGlobal — условное кол-во копий в «мире»
// ==========================================

export const PRIZES = {
    // 🦆 Утки
    plush_duck: {
        id: "plush_duck",
        name: "Плюшевая уточка",
        emoji: "🦆",
        rarity: "common",
        value: 5,
        collectionId: "duck_collection",
        maxCopiesGlobal: 100000,
    },
    rubber_duck: {
        id: "rubber_duck",
        name: "Резиновая утка",
        emoji: "🛁",
        rarity: "common",
        value: 6,
        collectionId: "duck_collection",
        maxCopiesGlobal: 80000,
    },
    golden_duck: {
        id: "golden_duck",
        name: "Золотая утка",
        emoji: "🥇",
        rarity: "epic",
        value: 50,
        collectionId: "duck_collection",
        maxCopiesGlobal: 5000,
    },

    // 🎮 Неоновый аркад
    neon_cat: {
        id: "neon_cat",
        name: "Неоновый кот",
        emoji: "😼",
        rarity: "rare",
        value: 15,
        collectionId: "neon_arcade",
        maxCopiesGlobal: 60000,
    },
    gold_cube: {
        id: "gold_cube",
        name: "Золотой куб",
        emoji: "🟨",
        rarity: "epic",
        value: 40,
        collectionId: "neon_arcade",
        maxCopiesGlobal: 20000,
    },
    arcade_token: {
        id: "arcade_token",
        name: "Жетон аркады",
        emoji: "🪙",
        rarity: "common",
        value: 8,
        collectionId: "neon_arcade",
        maxCopiesGlobal: 120000,
    },

    // 🦈 Акулячий сет
    pixel_shark: {
        id: "pixel_shark",
        name: "Пиксельная акула",
        emoji: "🦈",
        rarity: "epic",
        value: 70,
        collectionId: "akula_collection",
        maxCopiesGlobal: 8000,
    },
    ludo_core: {
        id: "ludo_core",
        name: "Ядро ЛудоМании",
        emoji: "💎",
        rarity: "legendary",
        value: 150,
        collectionId: "akula_collection",
        maxCopiesGlobal: 1000,
    },

    // 🫧 Кальянный клуб
    hookah_flask: {
        id: "hookah_flask",
        name: "Колба кальяна",
        emoji: "🫧",
        rarity: "rare",
        value: 25,
        collectionId: "hookah_collection",
        maxCopiesGlobal: 30000,
    },
    coal_box: {
        id: "coal_box",
        name: "Ящик угля",
        emoji: "🧱",
        rarity: "common",
        value: 10,
        collectionId: "hookah_collection",
        maxCopiesGlobal: 90000,
    },

    // 🕹 Ретро-сет
    retro_console: {
        id: "retro_console",
        name: "Ретро-приставка",
        emoji: "🎮",
        rarity: "epic",
        value: 60,
        collectionId: "retro_collection",
        maxCopiesGlobal: 7000,
    },
    golden_ticket: {
        id: "golden_ticket",
        name: "Золотой билет",
        emoji: "🎫",
        rarity: "legendary",
        value: 200,
        collectionId: "retro_collection",
        maxCopiesGlobal: 500,
    },
};

// ==========================================
// 🧩 КОЛЛЕКЦИИ
// (пока просто конфиг для будущих бонусов)
// ==========================================

export const COLLECTIONS = {
    duck_collection: {
        id: "duck_collection",
        name: "Утиное братство",
        requiredPrizeIds: ["plush_duck", "rubber_duck", "golden_duck"],
        bonus: {
            type: "clickMultiplier",
            value: 1.1, // +10% к клику
        },
    },
    neon_arcade: {
        id: "neon_arcade",
        name: "Неоновая аркада",
        requiredPrizeIds: ["neon_cat", "gold_cube", "arcade_token"],
        bonus: {
            type: "machineWinBonus",
            machineId: "street_claw",
            value: 0.05, // +5% к winChance
        },
    },
    akula_collection: {
        id: "akula_collection",
        name: "Акулячий сет",
        requiredPrizeIds: ["pixel_shark", "ludo_core"],
        bonus: {
            type: "clickMultiplier",
            value: 1.2, // +20% к клику
        },
    },
    hookah_collection: {
        id: "hookah_collection",
        name: "Кальянный клуб",
        requiredPrizeIds: ["hookah_flask", "coal_box"],
        bonus: {
            type: "sellBonus",
            value: 0.15, // +15% к цене продажи
        },
    },
    retro_collection: {
        id: "retro_collection",
        name: "Ретро-легенды",
        requiredPrizeIds: ["retro_console", "golden_ticket"],
        bonus: {
            type: "upgradeDiscount",
            value: 0.15, // -15% к стоимости апгрейдов
        },
    },
};

// ==========================================
// 🎰 АВТОМАТЫ
// minLevel — с какого уровня доступен
// ==========================================

export const MACHINES = [
    {
        id: "basic_claw",
        name: "🧸 Детский кран",
        price: 10,
        winChance: 0.55,
        description: "Лучший вариант для первых шагов.",
        minLevel: 0,
        prizePool: ["plush_duck", "rubber_duck", "arcade_token"],
    },
    {
        id: "street_claw",
        name: "🏙 Уличный автомат",
        price: 40,
        winChance: 0.4,
        description: "Средний риск, уже можно поймать редкости.",
        minLevel: 1,
        prizePool: ["plush_duck", "neon_cat", "gold_cube", "hookah_flask"],
    },
    {
        id: "casino_claw",
        name: "🎰 Казино-кран",
        price: 120,
        winChance: 0.3,
        description: "Меньше шансов, но больше epic и шанс на легендарку.",
        minLevel: 2,
        prizePool: [
            "neon_cat",
            "gold_cube",
            "pixel_shark",
            "retro_console",
            "hookah_flask",
        ],
    },
    {
        id: "vip_claw",
        name: "💎 VIP-лапа",
        price: 400,
        winChance: 0.22,
        description: "Только редкие и эпические игрушки.",
        minLevel: 3,
        prizePool: [
            "golden_duck",
            "gold_cube",
            "pixel_shark",
            "retro_console",
            "golden_ticket",
        ],
    },
    {
        id: "akula_jackpot",
        name: "🦈 Акулка Слот",
        price: 1000,
        winChance: 0.1,
        description: "Мало попыток, но призы по-настоящему жирные.",
        minLevel: 5,
        prizePool: ["pixel_shark", "ludo_core", "golden_ticket"],
    },
];

// ==========================================
// 🔧 УТИЛИТА ВЫБОРА СЛУЧАЙНОГО ПРИЗА
// ==========================================

export function randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}
