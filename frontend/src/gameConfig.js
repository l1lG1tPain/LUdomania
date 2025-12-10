// frontend/src/gameConfig.js

import imgMachine      from "./assets/machine.png";
import imgMachine2     from "./assets/machine2.png";
import imgMachine3     from "./assets/machine3.png";
import imgMachine4     from "./assets/machine4.png";
import imgMachine5     from "./assets/machine5.png";
import imgMachine6     from "./assets/machine6.png";
import imgMachine7     from "./assets/machine7.png";
import imgMachine8     from "./assets/machine8.png";
import imgMachine9     from "./assets/machine9.png";
import imgMachine10    from "./assets/machine10.png";
import imgMachine11    from "./assets/machine11.png";
import imgMachine12    from "./assets/machine12.png";
import imgMachineShark from "./assets/machine_shark.png";

// NFT-акулы — картинки
import nftShark001 from "./assets/sharks/nft_shark_001.png";
import nftShark002 from "./assets/sharks/nft_shark_002.png";
import nftShark003 from "./assets/sharks/nft_shark_003.png";
import nftShark004 from "./assets/sharks/nft_shark_004.png";
import nftShark005 from "./assets/sharks/nft_shark_005.png";
import nftShark006 from "./assets/sharks/nft_shark_006.png";
import nftShark007 from "./assets/sharks/nft_shark_007.png";
import nftShark008 from "./assets/sharks/nft_shark_008.png";
import nftShark009 from "./assets/sharks/nft_shark_009.png";
import nftShark010 from "./assets/sharks/nft_shark_010.png";
import nftShark011 from "./assets/sharks/nft_shark_011.png";
import nftShark012 from "./assets/sharks/nft_shark_012.png";
import nftShark013 from "./assets/sharks/nft_shark_013.png";
import nftShark014 from "./assets/sharks/nft_shark_014.png";
import nftShark015 from "./assets/sharks/nft_shark_015.png";
import nftShark016 from "./assets/sharks/nft_shark_016.png";
import nftShark017 from "./assets/sharks/nft_shark_017.png";
import nftShark018 from "./assets/sharks/nft_shark_018.png";
import nftShark019 from "./assets/sharks/nft_shark_019.png";
import nftShark020 from "./assets/sharks/nft_shark_020.png";

// ==========================================
// 🎚 УРОВНИ
// ==========================================

/**
 * Сколько кликов нужно для перехода на следующий уровень
 * Формула: 800 × 1.35^level → красиво, плавно и долгоиграюще
 */
export function getRequiredClicksForLevel(level) {
    const base   = 800;
    const growth = 1.35;
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

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const requiredForNext = getRequiredClicksForLevel(level);

        if (accumulatedClicks + requiredForNext > totalClicks) {
            break;
        }

        accumulatedClicks += requiredForNext;
        level++;
    }

    const required = getRequiredClicksForLevel(level);
    const current  = totalClicks - accumulatedClicks;
    const progress = required > 0 ? current / required : 1;

    return {
        level,
        current,
        required,
        progress: Number(progress.toFixed(4)),
        totalClicksRequiredSoFar: accumulatedClicks,
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
        weight: 100,
    },
    rare: {
        id: "rare",
        label: "Редкий",
        color: "#64b5f6",
        weight: 35,
    },
    epic: {
        id: "epic",
        label: "Эпический",
        color: "#ba68c8",
        weight: 12,
    },
    legendary: {
        id: "legendary",
        label: "Легендарный",
        color: "#ffca28",
        weight: 3,
    },
};

// ==========================================
// 🎁 ПРИЗЫ (база)
// ==========================================

const BASE_PRIZES = {
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
        maxCopiesGlobal: 40000,
    },
    golden_duck: {
        id: "golden_duck",
        name: "Золотая утка",
        emoji: "🥇",
        rarity: "epic",
        value: 180,
        collectionId: "duck_collection",
        maxCopiesGlobal: 5000,
    },
    diamond_duck: {
        id: "diamond_duck",
        name: "Бриллиантовая утка",
        emoji: "💎🦆",
        rarity: "epic",
        value: 250,
        collectionId: "duck_collection",
        maxCopiesGlobal: 3000,
    },

    // 🎮 Неоновый аркад
    neon_cat: {
        id: "neon_cat",
        name: "Неоновый кот",
        emoji: "😼",
        rarity: "rare",
        value: 80,
        collectionId: "neon_arcade",
        maxCopiesGlobal: 60000,
    },
    neon_dog: {
        id: "neon_dog",
        name: "Неоновый пес",
        emoji: "🐶",
        rarity: "rare",
        value: 90,
        collectionId: "neon_arcade",
        maxCopiesGlobal: 50000,
    },
    gold_cube: {
        id: "gold_cube",
        name: "Золотой куб",
        emoji: "🟨",
        rarity: "epic",
        value: 220,
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
        maxCopiesGlobal: 2000,
    },

    // 🦈 Акулячий сет
    pixel_shark: {
        id: "pixel_shark",
        name: "Пиксельная акула",
        emoji: "🦈",
        rarity: "epic",
        value: 380,
        collectionId: "akula_collection",
        maxCopiesGlobal: 8000,
    },
    shark_fin: {
        id: "shark_fin",
        name: "Плавник акулы",
        emoji: "🌊",
        rarity: "rare",
        value: 140,
        collectionId: "akula_collection",
        maxCopiesGlobal: 25000,
    },
    mega_shark: {
        id: "mega_shark",
        name: "Мега акула",
        emoji: "🦈💥",
        rarity: "epic",
        value: 450,
        collectionId: "akula_collection",
        maxCopiesGlobal: 6000,
    },
    ludo_core: {
        id: "ludo_core",
        name: "Ядро ЛудоМании",
        emoji: "💎",
        rarity: "legendary",
        value: 900,
        collectionId: "akula_collection",
        maxCopiesGlobal: 1000,
    },
    abyss_pearl: {
        id: "abyss_pearl",
        name: "Жемчужина бездны",
        emoji: "🦪",
        rarity: "legendary",
        value: 1200,
        collectionId: "akula_collection",
        maxCopiesGlobal: 800,
    },

    // 🫧 Кальянный клуб
    hookah_flask: {
        id: "hookah_flask",
        name: "Колба кальяна",
        emoji: "🫧",
        rarity: "rare",
        value: 120,
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
        maxCopiesGlobal: 10000,
    },
    smoke_ring: {
        id: "smoke_ring",
        name: "Кольцо дыма",
        emoji: "💨",
        rarity: "rare",
        value: 130,
        collectionId: "hookah_collection",
        maxCopiesGlobal: 35000,
    },

    // 🕹 Ретро-сет
    retro_console: {
        id: "retro_console",
        name: "Ретро-приставка",
        emoji: "🎮",
        rarity: "epic",
        value: 320,
        collectionId: "retro_collection",
        maxCopiesGlobal: 7000,
    },
    retro_joystick: {
        id: "retro_joystick",
        name: "Ретро-джойстик",
        emoji: "🕹",
        rarity: "rare",
        value: 140,
        collectionId: "retro_collection",
        maxCopiesGlobal: 40000,
    },
    vintage_cartridge: {
        id: "vintage_cartridge",
        name: "Винтажный картридж",
        emoji: "💾",
        rarity: "epic",
        value: 300,
        collectionId: "retro_collection",
        maxCopiesGlobal: 9000,
    },
    golden_ticket: {
        id: "golden_ticket",
        name: "Золотой билет",
        emoji: "🎫",
        rarity: "legendary",
        value: 1400,
        collectionId: "retro_collection",
        maxCopiesGlobal: 500,
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
        maxCopiesGlobal: 400,
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
        maxCopiesGlobal: 45000,
    },
    black_hole: {
        id: "black_hole",
        name: "Черная дыра",
        emoji: "🕳",
        rarity: "epic",
        value: 350,
        collectionId: "space_collection",
        maxCopiesGlobal: 8000,
    },
    star_crystal: {
        id: "star_crystal",
        name: "Звездный кристалл",
        emoji: "🌟",
        rarity: "legendary",
        value: 1000,
        collectionId: "space_collection",
        maxCopiesGlobal: 1200,
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
        maxCopiesGlobal: 50000,
    },
    golden_candy: {
        id: "golden_candy",
        name: "Золотая конфета",
        emoji: "🏆🍬",
        rarity: "epic",
        value: 260,
        collectionId: "candy_collection",
        maxCopiesGlobal: 15000,
    },
};

// ==========================================
// 🦈 NFT-акулы: мапа id → импортированная картинка
// ==========================================

const NFT_SHARK_IMAGES = {
    nft_shark_001: nftShark001,
    nft_shark_002: nftShark002,
    nft_shark_003: nftShark003,
    nft_shark_004: nftShark004,
    nft_shark_005: nftShark005,
    nft_shark_006: nftShark006,
    nft_shark_007: nftShark007,
    nft_shark_008: nftShark008,
    nft_shark_009: nftShark009,
    nft_shark_010: nftShark010,
    nft_shark_011: nftShark011,
    nft_shark_012: nftShark012,
    nft_shark_013: nftShark013,
    nft_shark_014: nftShark014,
    nft_shark_015: nftShark015,
    nft_shark_016: nftShark016,
    nft_shark_017: nftShark017,
    nft_shark_018: nftShark018,
    nft_shark_019: nftShark019,
    nft_shark_020: nftShark020,
};

// ==========================================
// 🎴 ПАКИ ПРИЗОВ (главная истина по NFT)
// ==========================================

export const PRIZE_PACKS = {
    nft_sharks: {
        id: "nft_sharks",
        label: "LudoSharks NFT",
        emoji: "🦈",
        collectionId: "nft_shark_pack",
        imageMap: NFT_SHARK_IMAGES,
        baseImagePath: "/assets",
        prizes: [
            {
                id: "nft_shark_001",
                name: "Akula #001 — Torch Акулка",
                rarity: "epic",
                value: 500,
                weight: 3,
                maxCopiesGlobal: 1000,
            },
            {
                id: "nft_shark_002",
                name: "Akula #002 — Basketkulka",
                rarity: "epic",
                value: 600,
                weight: 3,
                maxCopiesGlobal: 1000,
            },
            {
                id: "nft_shark_003",
                name: "Akula #003 — Японкулка",
                rarity: "epic",
                value: 700,
                weight: 2.5,
                maxCopiesGlobal: 1000,
            },
            {
                id: "nft_shark_004",
                name: "Akula #004 — Боксёркулка",
                rarity: "legendary",
                value: 900,
                weight: 2,
                maxCopiesGlobal: 1000,
            },
            {
                id: "nft_shark_005",
                name: "Akula #005 — Мечтакулка",
                rarity: "legendary",
                value: 1100,
                weight: 1.7,
                maxCopiesGlobal: 1000,
            },
            {
                id: "nft_shark_006",
                name: "Akula #006 — Лудакулка",
                rarity: "legendary",
                value: 1300,
                weight: 1.4,
                maxCopiesGlobal: 1000,
            },
            {
                id: "nft_shark_007",
                name: "Akula #007 — Котёнокулка",
                rarity: "legendary",
                value: 1600,
                weight: 1.1,
                maxCopiesGlobal: 1000,
            },
            {
                id: "nft_shark_008",
                name: "Akula #008 — Клоункулка",
                rarity: "legendary",
                value: 1900,
                weight: 0.9,
                maxCopiesGlobal: 1000,
            },
            {
                id: "nft_shark_009",
                name: "Akula #009 — Кодеркулка",
                rarity: "legendary",
                value: 2200,
                weight: 0.7,
                maxCopiesGlobal: 1000,
            },
            {
                id: "nft_shark_010",
                name: "Akula #010 — Крабкулка",
                rarity: "legendary",
                value: 2500,
                weight: 0.5,
                maxCopiesGlobal: 1000,
            },
            {
                id: "nft_shark_011",
                name: "Akula #011 — НямНямкулка",
                rarity: "legendary",
                value: 500,
                weight: 0.5,
                maxCopiesGlobal: 1010,
            },
            {
                id: "nft_shark_012",
                name: "Akula #012 — ГенАкулка",
                rarity: "legendary",
                value: 800,
                weight: 0.5,
                maxCopiesGlobal: 1000,
            },
            {
                id: "nft_shark_013",
                name: "Akula #013 — Некокулка",
                rarity: "legendary",
                value: 1000,
                weight: 0.2,
                maxCopiesGlobal: 100,
            },
            {
                id: "nft_shark_014",
                name: "Akula #014 — ЛудоМаникулка",
                rarity: "legendary",
                value: 1750,
                weight: 0.3,
                maxCopiesGlobal: 100,
            },
            {
                id: "nft_shark_015",
                name: "Akula #015 — Dolphinkulka",
                rarity: "legendary",
                value: 2500,
                weight: 0.5,
                maxCopiesGlobal: 1000,
            },
            {
                id: "nft_shark_016",
                name: "Dolphin — Не Акулка",
                rarity: "legendary",
                value: 3000,
                weight: 2.5,
                maxCopiesGlobal: 222,
            },
            {
                id: "nft_shark_017",
                name: "Akula #017 — Dragonkulka",
                rarity: "legendary",
                value: 2500,
                weight: 1.5,
                maxCopiesGlobal: 437,
            },
            {
                id: "nft_shark_018",
                name: "Akula #018 — Eaglekulka",
                rarity: "legendary",
                value: 5000,
                weight: 0.2,
                maxCopiesGlobal: 777,
            },
            {
                id: "nft_shark_019",
                name: "Akula #019 — Эльфкулка",
                rarity: "legendary",
                value: 222,
                weight: 7.8,
                maxCopiesGlobal: 1222,
            },
            {
                id: "nft_shark_020",
                name: "Akula #020 — Boomkulka",
                rarity: "legendary",
                value: 2225,
                weight: 0.7,
                maxCopiesGlobal: 1000,
            },
        ],
    },
};

function buildPrizesFromPacks(basePrizes, packs) {
    const result = { ...basePrizes };

    Object.values(packs).forEach((pack) => {
        const baseImagePath = pack.baseImagePath || "/assets";
        const packEmoji     = pack.emoji || "🎁";
        const imageMap      = pack.imageMap || {};

        (pack.prizes || []).forEach((p) => {
            const id       = p.id;
            const existing = result[id] || {};

            result[id] = {
                ...existing,
                id,
                name: p.name ?? existing.name ?? id,
                type: p.type ?? existing.type ?? "nft",
                emoji: p.emoji ?? existing.emoji ?? packEmoji,
                imageUrl:
                    p.imageUrl ??
                    existing.imageUrl ??
                    imageMap[id] ??
                    `${baseImagePath}/${id}.png`,
                rarity: p.rarity ?? existing.rarity ?? "common",
                value:  p.value  ?? existing.value  ?? 0,
                collectionId:
                    p.collectionId ??
                    existing.collectionId ??
                    pack.collectionId ??
                    null,
                maxCopiesGlobal:
                    p.maxCopiesGlobal ?? existing.maxCopiesGlobal,
                dropWeight: p.weight ?? existing.dropWeight,
                packId: pack.id,
            };
        });
    });

    return result;
}

export const PRIZES = buildPrizesFromPacks(BASE_PRIZES, PRIZE_PACKS);

// ==========================================
// 🎰 АВТОМАТЫ
// ==========================================

export const MACHINES = [
    // ===== Уровень 0 =====
    {
        id: "basic_claw",
        name: "🧸 Детский кран",
        image: imgMachine,
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
        image: imgMachine3,
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
        image: imgMachine8,
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
        image: imgMachine5,
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
        image: imgMachine6,
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
        image: imgMachine9,
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
        image: imgMachine7,
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
            "nft_shark_001",
            "nft_shark_002",
        ],
    },
    {
        id: "retro_casino",
        name: "🕹 Ретро-казино",
        image: imgMachine11,
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
            "nft_shark_002",
            "nft_shark_003",
            "nft_shark_011",
            "nft_shark_012",
        ],
    },
    {
        id: "space_slot",
        name: "🌌 Космический слот",
        image: imgMachine10,
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
            "nft_shark_003",
            "nft_shark_013",
            "nft_shark_014",
        ],
    },

    // ===== Уровень 3 =====
    {
        id: "vip_claw",
        name: "💎 VIP-лапа",
        image: imgMachine4,
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
            "nft_shark_004",
            "nft_shark_005",
            "nft_shark_015",
            "nft_shark_016",
        ],
    },
    {
        id: "elite_grabber",
        name: "🏆 Элитный захват",
        image: imgMachine2,
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
            "nft_shark_006",
            "nft_shark_017",
            "nft_shark_018",
        ],
    },
    {
        id: "candy_vip",
        name: "🍭 VIP-конфеты",
        image: imgMachine11,
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
            "nft_shark_005",
            "nft_shark_015",
        ],
    },

    // ===== Уровень 5 =====
    {
        id: "akula_jackpot",
        name: "🦈 Акулка Слот",
        image: imgMachineShark,
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
            "nft_shark_001",
            "nft_shark_002",
            "nft_shark_003",
            "nft_shark_004",
            "nft_shark_005",
            "nft_shark_006",
            "nft_shark_007",
            "nft_shark_008",
            "nft_shark_009",
            "nft_shark_010",
            "nft_shark_011",
            "nft_shark_012",
            "nft_shark_013",
            "nft_shark_014",
            "nft_shark_015",
            "nft_shark_016",
            "nft_shark_017",
            "nft_shark_018",
            "nft_shark_019",
            "nft_shark_020",
        ],
    },
    {
        id: "legendary_slot",
        name: "🏅 Легендарный слот",
        image: imgMachine12,
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
            "nft_shark_008",
            "nft_shark_009",
            "nft_shark_017",
            "nft_shark_018",
            "nft_shark_019",
            "nft_shark_020",
        ],
    },
    {
        id: "cosmic_jackpot",
        name: "🚀 Космический джекпот",
        image: imgMachine10,
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
            "nft_shark_007",
            "nft_shark_010",
            "nft_shark_017",
            "nft_shark_018",
            "nft_shark_019",
            "nft_shark_020",
        ],
    },
];

// ==========================================
// 🧩 КОЛЛЕКЦИИ
// ==========================================

export const COLLECTIONS = {
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
            value: 1.3,
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
            value: 0.12,
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
            value: 1.5,
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
            value: 0.25,
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
            value: 0.25,
        },
    },

    space_collection: {
        id: "space_collection",
        name: "Космическая одиссея",
        emoji: "Rocket",
        description: "До бесконечности и дальше!",
        requiredPrizeIds: ["space_rocket", "alien_head", "black_hole", "star_crystal"],
        bonus: {
            type: "machineWinBonus",
            machineId: "space_slot",
            value: 0.15,
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
            value: 1.4,
        },
    },

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
            value: 1.2,
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
            value: 0.25,
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
            value: 5000,
        },
    },
};

// ==========================================
// 🖼 Хелпер для отображения приза
// ==========================================

export function getPrizeVisual(prizeId) {
    const prize = PRIZES[prizeId];
    if (!prize) {
        return {
            type: "unknown",
            isNft: false,
            emoji: "❓",
            src: null,
            alt: prizeId,
        };
    }

    if (prize.type === "nft" && prize.imageUrl) {
        return {
            type: "nft",
            isNft: true,
            emoji: null,
            src: prize.imageUrl,
            alt: prize.name || prizeId,
        };
    }

    return {
        type: prize.type || "regular",
        isNft: false,
        emoji: prize.emoji || "❓",
        src: null,
        alt: prize.name || prizeId,
    };
}

// ==========================================
// 🔧 УТИЛИТА ВЫБОРА СЛУЧАЙНОГО ПРИЗА
// ==========================================

export function randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}
