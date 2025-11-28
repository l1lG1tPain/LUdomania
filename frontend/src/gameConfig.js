// frontend/src/gameConfig.js

// 🎁 Шаблоны призов
export const PRIZES = {
    plush_duck: {
        id: 'plush_duck',
        name: 'Плюшевая уточка',
        emoji: '🦆',
        rarity: 'common',
        value: 5,
    },
    neon_cat: {
        id: 'neon_cat',
        name: 'Неоновый кот',
        emoji: '😼',
        rarity: 'rare',
        value: 15,
    },
    gold_cube: {
        id: 'gold_cube',
        name: 'Золотой куб',
        emoji: '🟨',
        rarity: 'epic',
        value: 40,
    },
    ludo_core: {
        id: 'ludo_core',
        name: 'Ядро ЛудоМании',
        emoji: '💎',
        rarity: 'legendary',
        value: 120,
    },
};

// 🎰 Автоматы
// winChance — шанс выиграть вообще что-то
// prizePool — список id призов (чем круче автомат, тем дороже призы)
export const MACHINES = [
    {
        id: 'easy_claw',
        name: '🎲 Тестовый автомат',
        price: 5,
        winChance: 0.5, // 50%
        description: 'Дешёвый автомат для разогрева',
        prizePool: ['plush_duck', 'neon_cat'],
    },
    {
        id: 'mid_claw',
        name: '⚙️ Хрустальная лапа',
        price: 15,
        winChance: 0.25, // 25%
        description: 'Средний риск, средние награды',
        prizePool: ['neon_cat', 'gold_cube'],
    },
    {
        id: 'hard_claw',
        name: '🔥 Адский кран',
        price: 40,
        winChance: 0.12, // ~ 10–12%
        description: 'Мало шансов, но призы сочные',
        prizePool: ['gold_cube', 'ludo_core'],
    },
];

// утилита для выбора случайного элемента
export function randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}
