// frontend/src/gameConfig.js

// ==========================================
// 🎚 УРОВНИ
// ==========================================

/**
 * Сколько кликов нужно для перехода на следующий уровень
 * Формула: 800 × 1.35^level → красиво, плавно и долгоиграюще
 */
export function getRequiredClicksForLevel(level) {
    const base   = 800;   // базовый порог
    const growth = 1.35;  // коэффициент роста
    return Math.round(base * Math.pow(growth, level));
}

/**
 * Рассчитывает текущий уровень и прогресс по общему количеству кликов
 * Возвращает: { level, current, required, progress }
 */
export function calculateLevelState(totalClicks = 0) {
    if (totalClicks < 0) totalClicks = 0;

    let level = 0;
    let accumulatedClicks = 0;

    // Цикл идёт пока не упрёмся в текущий уровень
    while (true) {
        const requiredForNext = getRequiredClicksForLevel(level);

        if (accumulatedClicks + requiredForNext > totalClicks) {
            break;
        }

        accumulatedClicks += requiredForNext;
        level++;
    }

    const required  = getRequiredClicksForLevel(level);
    const current   = totalClicks - accumulatedClicks;
    const progress  = required > 0 ? current / required : 1;

    return {
        level,                                   // текущий уровень (начинается с 0)
        current,                                 // сколько уже набрано на следующий
        required,                                // сколько всего нужно на следующий
        progress: Number(progress.toFixed(4)),   // 0.0000 – 1.0000
        totalClicksRequiredSoFar: accumulatedClicks, // бонус: сколько всего было потрачено до этого уровня
    };
}

// ==========================================
// ⭐ РЕДКОСТИ
// weight — базовый вес для дропа (чем больше, тем чаще)
// Эти веса используются при расчёте шансов в автоматах
// ==========================================

export const RARITY_META = {
    common: {
        id: "common",
        label: "Обычный",
        color: "#b0bec5",
        weight: 100,   // базовый вес для обычных
    },
    rare: {
        id: "rare",
        label: "Редкий",
        color: "#64b5f6",
        weight: 35,    // выпадает заметно реже, чем common
    },
    epic: {
        id: "epic",
        label: "Эпический",
        color: "#ba68c8",
        weight: 12,    // ещё реже
    },
    legendary: {
        id: "legendary",
        label: "Легендарный",
        color: "#ffca28",
        weight: 3,     // самые редкие
    },
};

// ==========================================
// 🎁 ПРИЗЫ
// collectionId — к какой коллекции относится
// value — базовая цена продажи
// maxCopiesGlobal — условное кол-во копий в «мире»
// dropWeight (опционально) — переопределяет вес редкости
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
    wooden_duck: {
        id: "wooden_duck",
        name: "Деревянная утка",
        emoji: "🪵",
        rarity: "common",
        value: 4,
        collectionId: "duck_collection",
        maxCopiesGlobal: 120000,
    },
    silver_duck: {
        id: "silver_duck",
        name: "Серебряная утка",
        emoji: "🥈",
        rarity: "rare",
        value: 60,
        collectionId: "duck_collection",
        maxCopiesGlobal: 40000, // было 20 → 60
    },
    golden_duck: {
        id: "golden_duck",
        name: "Золотая утка",
        emoji: "🥇",
        rarity: "epic",
        value: 180,
        collectionId: "duck_collection",
        maxCopiesGlobal: 5000,  // было 50 → 180
    },
    diamond_duck: {
        id: "diamond_duck",
        name: "Бриллиантовая утка",
        emoji: "💎🦆",
        rarity: "epic",
        value: 250,
        collectionId: "duck_collection",
        maxCopiesGlobal: 3000,  // было 60 → 250
    },

    // 🎮 Неоновый аркад
    neon_cat: {
        id: "neon_cat",
        name: "Неоновый кот",
        emoji: "😼",
        rarity: "rare",
        value: 80,
        collectionId: "neon_arcade",
        maxCopiesGlobal: 60000, // 15 → 80
    },
    neon_dog: {
        id: "neon_dog",
        name: "Неоновый пес",
        emoji: "🐶",
        rarity: "rare",
        value: 90,
        collectionId: "neon_arcade",
        maxCopiesGlobal: 50000, // 18 → 90
    },
    gold_cube: {
        id: "gold_cube",
        name: "Золотой куб",
        emoji: "🟨",
        rarity: "epic",
        value: 220,
        collectionId: "neon_arcade",
        maxCopiesGlobal: 20000, // 40 → 220
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
    pixel_coin: {
        id: "pixel_coin",
        name: "Пиксельная монета",
        emoji: "💰",
        rarity: "common",
        value: 7,
        collectionId: "neon_arcade",
        maxCopiesGlobal: 150000,
    },
    platinum_cube: {
        id: "platinum_cube",
        name: "Платиновый куб",
        emoji: "🟪",
        rarity: "legendary",
        value: 600,
        collectionId: "neon_arcade",
        maxCopiesGlobal: 2000, // 100 → 600
    },

    // 🦈 Акулячий сет
    pixel_shark: {
        id: "pixel_shark",
        name: "Пиксельная акула",
        emoji: "🦈",
        rarity: "epic",
        value: 380,
        collectionId: "akula_collection",
        maxCopiesGlobal: 8000, // 70 → 380
    },
    shark_fin: {
        id: "shark_fin",
        name: "Плавник акулы",
        emoji: "🌊",
        rarity: "rare",
        value: 140,
        collectionId: "akula_collection",
        maxCopiesGlobal: 25000, // 30 → 140
    },
    mega_shark: {
        id: "mega_shark",
        name: "Мега акула",
        emoji: "🦈💥",
        rarity: "epic",
        value: 450,
        collectionId: "akula_collection",
        maxCopiesGlobal: 6000, // 80 → 450
    },
    ludo_core: {
        id: "ludo_core",
        name: "Ядро ЛудоМании",
        emoji: "💎",
        rarity: "legendary",
        value: 900,
        collectionId: "akula_collection",
        maxCopiesGlobal: 1000, // 150 → 900
    },
    abyss_pearl: {
        id: "abyss_pearl",
        name: "Жемчужина бездны",
        emoji: "🦪",
        rarity: "legendary",
        value: 1200,
        collectionId: "akula_collection",
        maxCopiesGlobal: 800, // 180 → 1200
    },

    // 🫧 Кальянный клуб
    hookah_flask: {
        id: "hookah_flask",
        name: "Колба кальяна",
        emoji: "🫧",
        rarity: "rare",
        value: 120,
        collectionId: "hookah_collection",
        maxCopiesGlobal: 30000, // 25 → 120
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
    hookah_hose: {
        id: "hookah_hose",
        name: "Шланг кальяна",
        emoji: "🛢",
        rarity: "common",
        value: 12,
        collectionId: "hookah_collection",
        maxCopiesGlobal: 70000,
    },
    premium_tobacco: {
        id: "premium_tobacco",
        name: "Премиум табак",
        emoji: "🍃",
        rarity: "epic",
        value: 280,
        collectionId: "hookah_collection",
        maxCopiesGlobal: 10000, // 50 → 280
    },
    smoke_ring: {
        id: "smoke_ring",
        name: "Кольцо дыма",
        emoji: "💨",
        rarity: "rare",
        value: 130,
        collectionId: "hookah_collection",
        maxCopiesGlobal: 35000, // 28 → 130
    },

    // 🕹 Ретро-сет
    retro_console: {
        id: "retro_console",
        name: "Ретро-приставка",
        emoji: "🎮",
        rarity: "epic",
        value: 320,
        collectionId: "retro_collection",
        maxCopiesGlobal: 7000, // 60 → 320
    },
    retro_joystick: {
        id: "retro_joystick",
        name: "Ретро-джойстик",
        emoji: "🕹",
        rarity: "rare",
        value: 140,
        collectionId: "retro_collection",
        maxCopiesGlobal: 40000, // 25 → 140
    },
    vintage_cartridge: {
        id: "vintage_cartridge",
        name: "Винтажный картридж",
        emoji: "💾",
        rarity: "epic",
        value: 300,
        collectionId: "retro_collection",
        maxCopiesGlobal: 9000, // 55 → 300
    },
    golden_ticket: {
        id: "golden_ticket",
        name: "Золотой билет",
        emoji: "🎫",
        rarity: "legendary",
        value: 1400,
        collectionId: "retro_collection",
        maxCopiesGlobal: 500, // 200 → 1400
    },
    pixel_controller: {
        id: "pixel_controller",
        name: "Пиксельный контроллер",
        emoji: "🎛",
        rarity: "common",
        value: 9,
        collectionId: "retro_collection",
        maxCopiesGlobal: 100000,
    },
    legendary_game: {
        id: "legendary_game",
        name: "Легендарная игра",
        emoji: "🕹🏆",
        rarity: "legendary",
        value: 1600,
        collectionId: "retro_collection",
        maxCopiesGlobal: 400, // 220 → 1600
    },

    // 🌌 Космический сет
    space_rocket: {
        id: "space_rocket",
        name: "Космическая ракета",
        emoji: "🚀",
        rarity: "common",
        value: 7,
        collectionId: "space_collection",
        maxCopiesGlobal: 110000,
    },
    alien_head: {
        id: "alien_head",
        name: "Голова инопланетянина",
        emoji: "👽",
        rarity: "rare",
        value: 110,
        collectionId: "space_collection",
        maxCopiesGlobal: 45000, // 22 → 110
    },
    black_hole: {
        id: "black_hole",
        name: "Черная дыра",
        emoji: "🕳",
        rarity: "epic",
        value: 350,
        collectionId: "space_collection",
        maxCopiesGlobal: 8000, // 60 → 350
    },
    star_crystal: {
        id: "star_crystal",
        name: "Звездный кристалл",
        emoji: "🌟",
        rarity: "legendary",
        value: 1000,
        collectionId: "space_collection",
        maxCopiesGlobal: 1200, // 140 → 1000
    },

    // 🍬 Конфетный сет
    candy_bar: {
        id: "candy_bar",
        name: "Шоколадный батончик",
        emoji: "🍫",
        rarity: "common",
        value: 5,
        collectionId: "candy_collection",
        maxCopiesGlobal: 130000,
    },
    lollipop: {
        id: "lollipop",
        name: "Леденец",
        emoji: "🍭",
        rarity: "common",
        value: 6,
        collectionId: "candy_collection",
        maxCopiesGlobal: 100000,
    },
    gummy_bear: {
        id: "gummy_bear",
        name: "Мармеладный мишка",
        emoji: "🧸🍬",
        rarity: "rare",
        value: 90,
        collectionId: "candy_collection",
        maxCopiesGlobal: 50000, // 15 → 90
    },
    golden_candy: {
        id: "golden_candy",
        name: "Золотая конфета",
        emoji: "🏆🍬",
        rarity: "epic",
        value: 260,
        collectionId: "candy_collection",
        maxCopiesGlobal: 15000, // 45 → 260
    },
};

// ==========================================
// 🎰 АВТОМАТЫ
// ==========================================

export const MACHINES = [
    // ===== Уровень 0 =====
    {
        id: "basic_claw",
        name: "🧸 Детский кран",
        image: "public/assets/machine.png",
        price: 250,
        winChance: 0.55,
        description: "Лучший вариант для первых шагов, только обычные призы.",
        minLevel: 0,
        prizePool: [
            "plush_duck",
            "rubber_duck",
            "arcade_token",
            "wooden_duck",
            "pixel_coin",
            "coal_box",
            "hookah_hose",
            "pixel_controller",
        ],
    },
    {
        id: "toy_grabber",
        name: "🪀 Игрушечный захват",
        image: "public/assets/machine3.png",
        price: 280,
        winChance: 0.52,
        description: "Простой автомат для новичков с базовыми игрушками.",
        minLevel: 0,
        prizePool: [
            "rubber_duck",
            "arcade_token",
            "coal_box",
            "space_rocket",
            "candy_bar",
            "lollipop",
            "wooden_duck",
        ],
    },
    {
        id: "candy_claw",
        name: "🍬 Конфетный кран",
        image: "public/assets/machine8.png",
        price: 260,
        winChance: 0.54,
        description: "Сладкие призы для начинающих.",
        minLevel: 0,
        prizePool: [
            "candy_bar",
            "lollipop",
            "plush_duck",
            "pixel_coin",
            "hookah_hose",
            "space_rocket",
        ],
    },

    // ===== Уровень 1 =====
    {
        id: "street_claw",
        name: "🏙 Уличный автомат",
        image: "public/assets/machine5.png",
        price: 800,
        winChance: 0.4,
        description: "Средний риск, уже можно поймать редкости.",
        minLevel: 1,
        prizePool: [
            "plush_duck",
            "neon_cat",
            "gold_cube",
            "hookah_flask",
            "silver_duck",
            "neon_dog",
            "shark_fin",
            "space_rocket",
            "candy_bar",
        ],
    },
    {
        id: "neon_grabber",
        name: "🌃 Неоновый захват",
        image: "public/assets/machine6.png",
        price: 850,
        winChance: 0.38,
        description: "Уличный стиль с неоновыми акцентами и редкими призами.",
        minLevel: 1,
        prizePool: [
            "neon_cat",
            "arcade_token",
            "hookah_flask",
            "alien_head",
            "gummy_bear",
            "wooden_duck",
            "pixel_coin",
        ],
    },
    {
        id: "hookah_street",
        name: "🫧 Уличный кальянный",
        image: "public/assets/machine9.png",
        price: 900,
        winChance: 0.42,
        description: "Призы из кальянной тематики с небольшим шансом на редкость.",
        minLevel: 1,
        prizePool: [
            "coal_box",
            "hookah_flask",
            "hookah_hose",
            "smoke_ring",
            "neon_dog",
            "candy_bar",
            "lollipop",
        ],
    },

    // ===== Уровень 2 =====
    {
        id: "casino_claw",
        name: "🎰 Казино-кран",
        image: "public/assets/machine7.png",
        price: 2200,
        winChance: 0.3,
        description: "Меньше шансов, но больше epic и шанс на легендарку.",
        minLevel: 2,
        prizePool: [
            "neon_cat",
            "gold_cube",
            "pixel_shark",
            "retro_console",
            "hookah_flask",
            "silver_duck",
            "premium_tobacco",
            "retro_joystick",
            "alien_head",
            "gummy_bear",
        ],
    },
    {
        id: "retro_casino",
        name: "🕹 Ретро-казино",
        image: "public/assets/machine11.png",
        price: 2400,
        winChance: 0.28,
        description: "Казино с ретро-тематикой и эпическими призами.",
        minLevel: 2,
        prizePool: [
            "retro_console",
            "retro_joystick",
            "vintage_cartridge",
            "gold_cube",
            "black_hole",
            "neon_cat",
            "hookah_flask",
        ],
    },
    {
        id: "space_slot",
        name: "🌌 Космический слот",
        image: "public/assets/machine10.png",
        price: 2000,
        winChance: 0.32,
        description: "Призы из космоса с шансом на эпик.",
        minLevel: 2,
        prizePool: [
            "space_rocket",
            "alien_head",
            "black_hole",
            "pixel_shark",
            "premium_tobacco",
            "gummy_bear",
            "neon_dog",
        ],
    },

    // ===== Уровень 3 =====
    {
        id: "vip_claw",
        name: "💎 VIP-лапа",
        image: "public/assets/machine4.png",
        price: 6500,
        winChance: 0.22,
        description: "Только редкие и эпические игрушки.",
        minLevel: 3,
        prizePool: [
            "golden_duck",
            "gold_cube",
            "pixel_shark",
            "retro_console",
            "golden_ticket",
            "diamond_duck",
            "mega_shark",
            "vintage_cartridge",
            "black_hole",
            "golden_candy",
        ],
    },
    {
        id: "elite_grabber",
        name: "🏆 Элитный захват",
        image: "public/assets/machine2.png",
        price: 7200,
        winChance: 0.20,
        description: "VIP-доступ к эпическим и редким призам.",
        minLevel: 3,
        prizePool: [
            "gold_cube",
            "pixel_shark",
            "premium_tobacco",
            "black_hole",
            "golden_candy",
            "platinum_cube",
            "retro_console",
        ],
    },
    {
        id: "candy_vip",
        name: "🍭 VIP-конфеты",
        image: "public/assets/machine11.png",
        price: 6200,
        winChance: 0.24,
        description: "Сладкие эпические призы для элиты.",
        minLevel: 3,
        prizePool: [
            "gummy_bear",
            "golden_candy",
            "golden_duck",
            "diamond_duck",
            "vintage_cartridge",
            "alien_head",
            "shark_fin",
        ],
    },

    // ===== Уровень 5 =====
    {
        id: "akula_jackpot",
        name: "🦈 Акулка Слот",
        image: "public/assets/machine_shark.png",
        price: 15000,
        winChance: 0.1,
        description: "Мало попыток, но призы по-настоящему жирные.",
        minLevel: 5,
        prizePool: [
            "pixel_shark",
            "ludo_core",
            "golden_ticket",
            "platinum_cube",
            "abyss_pearl",
            "star_crystal",
            "legendary_game",
            "mega_shark",
        ],
    },
    {
        id: "legendary_slot",
        name: "🏅 Легендарный слот",
        image: "public/assets/machine12.png",
        price: 18000,
        winChance: 0.08,
        description: "Шанс на настоящие легендарки и топ-эпики.",
        minLevel: 5,
        prizePool: [
            "ludo_core",
            "golden_ticket",
            "star_crystal",
            "abyss_pearl",
            "legendary_game",
            "platinum_cube",
            "golden_candy",
        ],
    },
    {
        id: "cosmic_jackpot",
        name: "🚀 Космический джекпот",
        image: "public/assets/machine10.png",
        price: 14000,
        winChance: 0.12,
        description: "Жирные призы из космоса и акул.",
        minLevel: 5,
        prizePool: [
            "star_crystal",
            "black_hole",
            "ludo_core",
            "mega_shark",
            "legendary_game",
            "golden_ticket",
            "platinum_cube",
        ],
    },
];

// ==========================================
// 🧩 КОЛЛЕКЦИИ
// (пока просто конфиг для будущих бонусов)
// ==========================================

export const COLLECTIONS = {
    // Старые, но усиленные
    duck_collection: {
        id: "duck_collection",
        name: "Утиное братство",
        emoji: "Duck",
        description: "Собери всех уток — стань королём пруда!",
        requiredPrizeIds: [
            "plush_duck",
            "rubber_duck",
            "wooden_duck",
            "silver_duck",
            "golden_duck",
            "diamond_duck",
        ],
        bonus: {
            type: "clickMultiplier",
            value: 1.3, // +30% к кликам (было +10%)
        },
    },

    neon_arcade: {
        id: "neon_arcade",
        name: "Неоновая аркада",
        emoji: "Arcade",
        description: "Зажги неоновые огни старой школы",
        requiredPrizeIds: [
            "arcade_token",
            "pixel_coin",
            "neon_cat",
            "neon_dog",
            "gold_cube",
            "platinum_cube",
        ],
        bonus: {
            type: "machineWinBonus",
            machineId: "street_claw",
            value: 0.12, // +12% к шансу выигрыша (было 5%)
        },
    },

    akula_collection: {
        id: "akula_collection",
        name: "Акулий синдикат",
        emoji: "Shark",
        description: "Ты либо акула, либо корм",
        requiredPrizeIds: ["shark_fin", "pixel_shark", "mega_shark", "ludo_core", "abyss_pearl"],
        bonus: {
            type: "clickMultiplier",
            value: 1.5, // +50% к кликам — самая мощная кликовая коллекция
        },
    },

    hookah_collection: {
        id: "hookah_collection",
        name: "Кальянный клуб «Дым»",
        emoji: "Hookah",
        description: "Расслабься и дыши глубже",
        requiredPrizeIds: [
            "coal_box",
            "hookah_hose",
            "hookah_flask",
            "smoke_ring",
            "premium_tobacco",
        ],
        bonus: {
            type: "sellBonus",
            value: 0.25, // +25% к цене продажи всех призов
        },
    },

    retro_collection: {
        id: "retro_collection",
        name: "Ретро-легенды 8-bit",
        emoji: "Retro Controller",
        description: "Время, когда игры были сложными, а мы — молодыми",
        requiredPrizeIds: [
            "pixel_controller",
            "retro_joystick",
            "retro_console",
            "vintage_cartridge",
            "golden_ticket",
            "legendary_game",
        ],
        bonus: {
            type: "upgradeDiscount",
            value: 0.25, // −25% ко всем апгрейдам
        },
    },

    // Новые коллекции
    space_collection: {
        id: "space_collection",
        name: "Космическая одиссея",
        emoji: "Rocket",
        description: "До бесконечности и дальше!",
        requiredPrizeIds: ["space_rocket", "alien_head", "black_hole", "star_crystal"],
        bonus: {
            type: "machineWinBonus",
            machineId: "space_slot",
            value: 0.15, // +15% шанса в космическом автомате
        },
    },

    candy_collection: {
        id: "candy_collection",
        name: "Сладкое королевство",
        emoji: "Candy",
        description: "Собери все конфеты и никогда не грусти",
        requiredPrizeIds: ["candy_bar", "lollipop", "gummy_bear", "golden_candy"],
        bonus: {
            type: "dailyRewardMultiplier",
            value: 1.4, // +40% к ежедневным наградам
        },
    },

    // Премиум-комбо коллекции (очень сложные, но мощные)
    platinum_vault: {
        id: "platinum_vault",
        name: "Платиновый тайник",
        emoji: "Vault",
        description: "Только для тех, кто собрал почти всё",
        requiredPrizeIds: [
            "platinum_cube",
            "diamond_duck",
            "abyss_pearl",
            "star_crystal",
            "legendary_game",
        ],
        bonus: {
            type: "globalMultiplier",
            value: 1.2, // +20% ко ВСЕМ доходам и кликам навсегда
        },
    },

    ultimate_jackpot: {
        id: "ultimate_jackpot",
        name: "Абсолютный джекпот",
        emoji: "Jackpot",
        description: "Легенда среди легенд. Только 100 человек в мире соберут",
        requiredPrizeIds: [
            "ludo_core",
            "golden_ticket",
            "legendary_game",
            "abyss_pearl",
            "star_crystal",
            "platinum_cube",
        ],
        bonus: {
            type: "machineWinBonus",
            machineId: "akula_jackpot",
            value: 0.25, // +25% к шансу в самом дорогом автомате
        },
    },

    golden_era: {
        id: "golden_era",
        name: "Золотая эра",
        emoji: "Crown",
        description: "Все золотые призы в одном месте",
        requiredPrizeIds: ["golden_duck", "gold_cube", "golden_ticket", "golden_candy"],
        bonus: {
            type: "passiveIncome",
            value: 5000, // +5000 монет в минуту пассивно
        },
    },
};

// ==========================================
// 🔧 УТИЛИТА ВЫБОРА СЛУЧАЙНОГО ПРИЗА
// (равномерная, сейчас используется только как fallback)
// ==========================================

export function randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}
