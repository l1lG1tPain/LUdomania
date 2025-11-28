// server.js
// Простой auth-сервер для LUdomania:
// - принимает initData от Telegram WebApp
// - проверяет подпись
// - создаёт/обновляет пользователя в Firestore
// - возвращает Firebase Custom Token

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(express.json());
const corsOptions = {
    origin: [
        'http://localhost:5173', // Vite dev
        // сюда потом добавишь прод-домен, типа 'https://ludomania.vercel.app'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false,
};
app.use(cors());

// ==== Firebase Admin init ====
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

// ==== Config ====
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN не задан в .env');
}

// ==== Функция проверки подписи Telegram initData ====
function checkTelegramAuth(initDataString) {
    // initDataString — это строка "query_id=...&user=...&hash=..."
    const urlParams = new URLSearchParams(initDataString);
    const hash = urlParams.get('hash');

    if (!hash) {
        return false;
    }

    urlParams.delete('hash');

    // Собираем data_check_string: key=value\nkey=value
    const dataCheckString = Array.from(urlParams.entries())
        .sort(([aKey], [bKey]) => aKey.localeCompare(bKey))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    // secret_key = HMAC_SHA256("WebAppData", BOT_TOKEN)
    const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(BOT_TOKEN)
        .digest();

    // Проверяем хэш: HMAC_SHA256(data_check_string, secret_key)
    const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    return calculatedHash === hash;
}

// ==== Маршрут /auth/telegram ====
// Ожидает { initData: "..." }
app.post('/auth/telegram', async (req, res) => {
    try {
        const { initData } = req.body;

        if (!initData) {
            return res.status(400).json({ error: 'initData is required' });
        }

        // 1) Проверяем подпись
        const isValid = checkTelegramAuth(initData);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid Telegram auth data' });
        }

        // 2) Получаем user из initData
        const params = new URLSearchParams(initData);
        const userParam = params.get('user');

        if (!userParam) {
            return res.status(400).json({ error: 'No user data in initData' });
        }

        const tgUser = JSON.parse(userParam);

        const telegramId = tgUser.id;
        const uid = `tg_${telegramId}`;

        const username = tgUser.username || null;
        const firstName = tgUser.first_name || '';
        const photoUrl = tgUser.photo_url || null;

        const now = admin.firestore.FieldValue.serverTimestamp();

        // 3) Создаём/обновляем документ пользователя в Firestore
        const userRef = firestore.collection('users').doc(uid);

        await userRef.set(
            {
                telegram_id: telegramId,
                username,
                firstName,
                photoUrl,
                lastLogin: now,
                // createdAt устанавливаем только при первом создании, поэтому merge
                createdAt: now,
            },
            { merge: true }
        );

        // 4) Генерим кастомный токен Firebase
        const customToken = await admin.auth().createCustomToken(uid, {
            telegram_id: telegramId,
            username,
        });

        // 5) Возвращаем токен фронту
        return res.json({ token: customToken });
    } catch (err) {
        console.error('Telegram auth error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ==== health-check ====
app.get('/', (req, res) => {
    res.send('LUdomania auth server is running');
});

// ==== Запуск сервера ====
app.listen(PORT, () => {
    console.log(`🚀 Auth server listening on port ${PORT}`);
});
