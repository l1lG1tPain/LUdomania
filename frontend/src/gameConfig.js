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

    const required = getRequiredClicksForLevel(level);
    const current = totalClicks - accumulatedClicks;
    const progress = required > 0 ? current / required : 1;

    return {
        level,                              // текущий уровень (начинается с 0)
        current,                            // сколько уже набрано на следующий
        required,                           // сколько всего нужно на следующий
        progress: Number(progress.toFixed(4)), // 0.0000 – 1.0000
        totalClicksRequiredSoFar: accumulatedClicks, // бонус: сколько всего было потрачено до этого уровня
    };
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
        // Утки
        plush_duck:      { id: "plush_duck",      name: "Плюшевая уточка",      emoji: "Duck",   rarity: "common",     value: 8,      collectionId: "duck_collection", maxCopiesGlobal: 100000 },
        rubber_duck:     { id: "rubber_duck",     name: "Резиновая утка",       emoji: "Bath",   rarity: "common",     value: 10,     collectionId: "duck_collection", maxCopiesGlobal: 80000  },
        wooden_duck:     { id: "wooden_duck",     name: "Деревянная утка",      emoji: "Wood",   rarity: "common",     value: 7,      collectionId: "duck_collection", maxCopiesGlobal: 120000 },
        silver_duck:     { id: "silver_duck",     name: "Серебряная утка",      emoji: "Second Place", rarity: "rare",       value: 35,     collectionId: "duck_collection", maxCopiesGlobal: 40000  },
        golden_duck:     { id: "golden_duck",     name: "Золотая утка",         emoji: "First Place",  rarity: "epic",       value: 350,   collectionId: "duck_collection", maxCopiesGlobal: 5000   }, // было 50 → 350
        diamond_duck:    { id: "diamond_duck",    name: "Бриллиантовая утка",   emoji: "Gem Stone Duck", rarity: "epic",    value: 450,   collectionId: "duck_collection", maxCopiesGlobal: 3000   }, // было 60 → 450

        // Неоновая аркада
        arcade_token:    { id: "arcade_token",    name: "Жетон аркады",         emoji: "Coin",   rarity: "common",     value: 12,     collectionId: "neon_arcade", maxCopiesGlobal: 120000 },
        pixel_coin:      { id: "pixel_coin",      name: "Пиксельная монета",    emoji: "Money Bag", rarity: "common",  value: 10,     collectionId: "neon_arcade", maxCopiesGlobal: 150000 },
        neon_cat:        { id: "neon_cat",        name: "Неоновый кот",         emoji: "Smirking Cat", rarity: "rare",    value: 45,     collectionId: "neon_arcade", maxCopiesGlobal: 60000  },
        neon_dog:        { id: "neon_dog",        name: "Неоновый пес",         emoji: "Dog",    rarity: "rare",       value: 50,     collectionId: "neon_arcade", maxCopiesGlobal: 50000  },
        gold_cube:       { id: "gold_cube",       name: "Золотой куб",          emoji: "Yellow Square", rarity: "epic",   value: 400,    collectionId: "neon_arcade", maxCopiesGlobal: 20000  }, // было 40 → 400
        platinum_cube:   { id: "platinum_cube",   name: "Платиновый куб",       emoji: "Purple Square", rarity: "legendary", value: 1500, collectionId: "neon_arcade", maxCopiesGlobal: 2000   }, // было 100 → 1500

        // Акулий сет
        shark_fin:       { id: "shark_fin",       name: "Плавник акулы",        emoji: "Water Wave", rarity: "rare",   value: 70,     collectionId: "akula_collection", maxCopiesGlobal: 25000 },
        pixel_shark:     { id: "pixel_shark",     name: "Пиксельная акула",     emoji: "Shark",  rarity: "epic",       value: 700,    collectionId: "akula_collection", maxCopiesGlobal: 8000  }, // было 70 → 700
        mega_shark:      { id: "mega_shark",      name: "Мега акула",           emoji: "Shark Explosion", rarity: "epic", value: 900,    collectionId: "akula_collection", maxCopiesGlobal: 6000  }, // было 80 → 900
        ludo_core:       { id: "ludo_core",       name: "Ядро ЛудоМании",         emoji: "Gem Stone", rarity: "legendary", value: 3000, collectionId: "akula_collection", maxCopiesGlobal: 1000  }, // было 150 → 3000
        abyss_pearl:     { id: "abyss_pearl",     name: "Жемчужина бездны",     emoji: "Oyster", rarity: "legendary", value: 4000, collectionId: "akula_collection", maxCopiesGlobal: 800   }, // было 180 → 4000

        // Кальянный клуб
        coal_box:        { id: "coal_box",        name: "Ящик угля",            emoji: "Brick",  rarity: "common",     value: 15,     collectionId: "hookah_collection", maxCopiesGlobal: 90000 },
    hookah_hose:     { id: "hookah_hose",     name: "Шланг кальяна",        emoji: "Barrel", rarity: "common",     value: 18,     collectionId: "hookah_collection", maxCopiesGlobal: 70000    },
    hookah_flask:    { id: "hookah_flask",    name: "Колба кальяна",        emoji: "Bubbles", rarity: "rare",      value: 80,     collectionId: "hookah_collection", maxCopiesGlobal: 30000    },
    smoke_ring:      { id: "smoke_ring",      name: "Кольцо дыма",          emoji: "Dashing Away", rarity: "rare", value: 90,     collectionId: "hookah_collection", maxCopiesGlobal: 35000    },
    premium_tobacco: { id: "premium_tobacco", name: "Премиум табак",        emoji: "Herb",   rarity: "epic",       value: 500,    collectionId: "hookah_collection", maxCopiesGlobal: 10000   }, // было 50 → 500

    // Ретро
    pixel_controller:{ id: "pixel_controller",name: "Пиксельный контроллер",emoji: "Control Knobs", rarity: "common", value: 14, collectionId: "retro_collection", maxCopiesGlobal: 100000 },
    retro_joystick:  { id: "retro_joystick",  name: "Ретро-джойстик",       emoji: "Joystick", rarity: "rare",   value: 75,     collectionId: "retro_collection", maxCopiesGlobal: 40000  },
    retro_console:   { id: "retro_console",   name: "Ретро-приставка",     emoji: "Game Die", rarity: "epic",   value: 650,    collectionId: "retro_collection", maxCopiesGlobal: 7000   }, // было 60 → 650
    vintage_cartridge:{id: "vintage_cartridge",name: "Винтажный картридж",  emoji: "Floppy Disk", rarity: "epic",value: 600,    collectionId: "retro_collection", maxCopiesGlobal: 9000   }, // было 55 → 600
    golden_ticket:   { id: "golden_ticket",   name: "Золотой билет",       emoji: "Ticket", rarity: "legendary", value: 5000,collectionId: "retro_collection", maxCopiesGlobal: 500    }, // было 200 → 5000
    legendary_game: { id: "legendary_game", name: "Легендарная игра",    emoji: "Joystick Trophy", rarity: "legendary", value: 6000,collectionId: "retro_collection", maxCopiesGlobal: 400    }, // было 220 → 6000

    // Космос
    space_rocket:    { id: "space_rocket",    name: "Космическая ракета",   emoji: "Rocket", rarity: "common",     value: 12,    collectionId: "space_collection", maxCopiesGlobal: 110000 },
    alien_head:      { id: "alien_head",      name: "Голова инопланетянина",emoji: "Alien", rarity: "rare",    value: 65,    collectionId: "space_collection", maxCopiesGlobal: 45000  },
    black_hole:      { id: "black_hole",      name: "Черная дыра",         emoji: "Hole",   rarity: "epic",       value: 700,   collectionId: "space_collection", maxCopiesGlobal: 8000   }, // было 60 → 700
    star_crystal:    { id: "star_crystal",    name: "Звёздный кристалл",  emoji: "Glowing Star", rarity: "legendary", value: 3500, collectionId: "space_collection", maxCopiesGlobal: 1200   }, // было 140 → 3500

    // Конфеты
    candy_bar:       { id: "candy_bar",       name: "Шоколадный батончик", emoji: "Chocolate Bar", rarity: "common", value: 8,  collectionId: "candy_collection", maxCopiesGlobal: 130000 },
    lollipop:        { id: "lollipop",        name: "Леденец",              emoji: "Lollipop", rarity: "common", value: 9,  collectionId: "candy_collection", maxCopiesGlobal: 100000 },
    gummy_bear:      { id: "gummy_bear",      name: "Мармеладный мишка",   emoji: "Teddy Bear Candy", rarity: "rare", value: 40, collectionId: "candy_collection", maxCopiesGlobal: 50000  },
    golden_candy:    { id: "golden_candy",    name: "Золотая конфета",      emoji: "Trophy Candy", rarity: "epic", value: 400, collectionId: "candy_collection", maxCopiesGlobal: 15000  }, // было 45 → 400
};

export const MACHINES = [
    // === УРОВЕНЬ 0 — Новички (всё ещё могут покрутить, но уже не бесплатно ===
    {
        id: "basic_claw",
        name: "Детский кран",
        price: 250,
        winChance: 0.58,
        description: "Для самых первых шагов. Дёшево, но уже можно начать копить на что-то серьёзное.",
        minLevel: 0,
        prizePool: ["plush_duck", "rubber_duck", "arcade_token", "wooden_duck", "pixel_coin", "coal_box", "hookah_hose", "pixel_controller", "candy_bar", "lollipop"],
    },
    {
        id: "toy_grabber",
        name: "Игрушечный захват",
        price: 400,
        winChance: 0.55,
        description: "Чуть дороже — чуть лучше призы.",
        minLevel: 0,
        prizePool: ["rubber_duck", "arcade_token", "coal_box", "space_rocket", "candy_bar", "lollipop", "wooden_duck", "pixel_coin"],
    },
    {
        id: "candy_claw",
        name: "Конфетный кран",
        price: 300,
        winChance: 0.57,
        description: "Сладко и недорого — идеально для старта.",
        minLevel: 0,
        prizePool: ["candy_bar", "lollipop", "plush_duck", "pixel_coin", "hookah_hose", "space_rocket"],
    },

    // === УРОВЕНЬ 1–2 — Средний сегмент (здесь уже начинается настоящая игра) ===
    {
        id: "street_claw",
        name: "Уличный автомат",
        price: 2_500,
        winChance: 0.42,
        description: "Первый серьёзный автомат. Здесь уже можно поймать rare.",
        minLevel: 1,
        prizePool: ["plush_duck", "neon_cat", "gold_cube", "hookah_flask", "silver_duck", "neon_dog", "shark_fin", "alien_head", "gummy_bear"],
    },
    {
        id: "neon_grabber",
        name: "Неоновый захват",
        price: 3_200,
        winChance: 0.40,
        description: "Стильно, модно, молодёжно — и уже дорого.",
        minLevel: 1,
        prizePool: ["neon_cat", "neon_dog", "hookah_flask", "alien_head", "gummy_bear", "smoke_ring"],
    },
    {
        id: "hookah_street",
        name: "Уличный кальянный",
        price: 2_800,
        winChance: 0.43,
        description: "Дым, чилл и первые редкие призы.",
        minLevel: 1,
        prizePool: ["coal_box", "hookah_flask", "hookah_hose", "smoke_ring", "premium_tobacco"],
    },

    // === УРОВЕНЬ 2–3 — Казино зона (здесь уже больно по кошельку) ===
    {
        id: "casino_claw",
        name: "Казино-кран",
        price: 15_000,
        winChance: 0.32,
        description: "Добро пожаловать в зону риска. Epic уже близко.",
        minLevel: 2,
        prizePool: ["gold_cube", "pixel_shark", "retro_console", "premium_tobacco", "black_hole", "vintage_cartridge", "golden_candy"],
    },
    {
        id: "retro_casino",
        name: "Ретро-казино",
        price: 18_000,
        winChance: 0.30,
        description: "8-битные легенды за реальные деньги.",
        minLevel: 2,
        prizePool: ["retro_console", "retro_joystick", "vintage_cartridge", "golden_ticket", "legendary_game"],
    },
    {
        id: "space_slot",
        name: "Космический слот",
        price: 12_000,
        winChance: 0.34,
        description: "Космос не прощает ошибок.",
        minLevel: 2,
        prizePool: ["alien_head", "black_hole", "star_crystal", "space_rocket"],
    },

    // === УРОВЕНЬ 3–4 — VIP зона (только для тех, кто уже в теме) ===
    {
        id: "vip_claw",
        name: "VIP-лапа",
        price: 75_000,
        winChance: 0.25,
        description: "Только избранные. Только epic и выше.",
        minLevel: 3,
        prizePool: ["golden_duck", "diamond_duck", "pixel_shark", "retro_console", "golden_ticket", "black_hole", "platinum_cube", "mega_shark"],
    },
    {
        id: "elite_grabber",
        name: "Элитный захват",
        price: 90_000,
        winChance: 0.23,
        description: "Здесь играют по-крупному.",
        minLevel: 3,
        prizePool: ["platinum_cube", "diamond_duck", "abyss_pearl", "legendary_game", "star_crystal"],
    },

    // === УРОВЕНЬ 5+ — ДЖЕКПОТ ЗОНА (киты, готовьте кошельки) ===
    {
        id: "akula_jackpot",
        name: "Акулка Слот",
        price: 500_000,           // было 1000 → стало 500к
        winChance: 0.10,
        description: "Один спин — и ты либо король, либо нищий.",
        minLevel: 5,
        prizePool: ["ludo_core", "abyss_pearl", "star_crystal", "legendary_game", "platinum_cube", "golden_ticket"],
    },
    {
        id: "legendary_slot",
        name: "Легендарный слот",
        price: 750_000,
        winChance: 0.08,
        description: "Тот самый автомат, о котором шепчутся в чатах.",
        minLevel: 5,
        prizePool: ["ludo_core", "legendary_game", "abyss_pearl", "star_crystal"],
    },
    {
        id: "cosmic_jackpot",
        name: "Космический джекпот",
        price: 400_000,
        winChance: 0.12,
        description: "Самый «щедрый» из топовых.",
        minLevel: 5,
        prizePool: ["star_crystal", "ludo_core", "platinum_cube", "legendary_game"],
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
            "diamond_duck"
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
            "platinum_cube"
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
            "premium_tobacco"
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
            "legendary_game"
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
            "legendary_game"
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
            "platinum_cube"
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
        requiredPrizeIds: [
            "golden_duck",
            "gold_cube",
            "golden_ticket",
            "golden_candy"
        ],
        bonus: {
            type: "passiveIncome",
            value: 5000, // +5000 монет в минуту пассивно
        },
    },
};



// ==========================================
// 🔧 УТИЛИТА ВЫБОРА СЛУЧАЙНОГО ПРИЗА
// ==========================================

export function randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}
