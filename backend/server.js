// backend/server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(express.json());

// CORS: локалка + Vercel
app.use(cors({
    origin: [
        'http://localhost:5173',               // Vite dev
        'https://ludomania-app.vercel.app'     // твой фронт
    ],
    methods: ['GET', 'POST', 'OPTIONS']
}));

// ==== Firebase Admin init ====
// Локально берём ключ из файла, на Render — из ENV
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
    serviceAccount = require('./serviceAccountKey.json');
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

// ==== Config ====
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 3000;

// ==== Проверка подписи от Telegram WebApp ====
function checkTelegramAuth(initDataString) {
    const urlParams = new URLSearchParams(initDataString);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

    const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(BOT_TOKEN)
        .digest();

    const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    return calculatedHash === hash;
}

// ==== POST /auth/telegram ====
app.post('/auth/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) return res.status(400).json({ error: 'initData is required' });

        if (!checkTelegramAuth(initData)) {
            return res.status(401).json({ error: 'Invalid Telegram auth data' });
        }

        const params = new URLSearchParams(initData);
        const userParam = params.get('user');
        if (!userParam) return res.status(400).json({ error: 'No user data in initData' });

        const tgUser = JSON.parse(userParam);

        const telegramId = tgUser.id;
        const uid = `tg_${telegramId}`;
        const now = admin.firestore.FieldValue.serverTimestamp();

        const userRef = firestore.collection('users').doc(uid);

        await userRef.set({
            telegram_id: telegramId,
            username: tgUser.username || null,
            firstName: tgUser.first_name || '',
            photoUrl: tgUser.photo_url || null,
            lastLogin: now,
            createdAt: now
        }, { merge: true });

        const customToken = await admin.auth().createCustomToken(uid, {
            telegram_id: telegramId,
            username: tgUser.username || null
        });

        res.json({ token: customToken });
    } catch (err) {
        console.error('Telegram auth error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// health-check
app.get('/', (req, res) => {
    res.send('LUdomania auth server is running');
});

app.listen(PORT, () => {
    console.log(`🚀 Auth server listening on port ${PORT}`);
});
