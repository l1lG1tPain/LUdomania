// backend/server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const admin = require('firebase-admin');
require('dotenv').config();

// ==== Утилита генерации короткого кода для браузерной авторизации ====
function generateCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < length; i++) {
        res += chars[Math.floor(Math.random() * chars.length)];
    }
    return res;
}

const app = express();
app.use(express.json());

// CORS: локалка + Vercel
app.use(
    cors({
        origin: [
            'http://localhost:5173',           // Vite dev
            'https://ludomania-app.vercel.app' // фронт на Vercel
        ],
        methods: ['GET', 'POST', 'OPTIONS'],
    })
);

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
const BROWSER_AUTH_SECRET = process.env.BROWSER_AUTH_SECRET;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN не задан в .env');
}
if (!BROWSER_AUTH_SECRET) {
    console.warn('⚠️ BROWSER_AUTH_SECRET не задан в .env (нужен для browser-auth)');
}

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

// ===================================================================
// 1) ЛОГИН ИЗ TELEGRAM MINIAPP (initData) — /auth/telegram
// ===================================================================
app.post('/auth/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) {
            return res.status(400).json({ error: 'initData is required' });
        }

        if (!checkTelegramAuth(initData)) {
            return res.status(401).json({ error: 'Invalid Telegram auth data' });
        }

        const params = new URLSearchParams(initData);
        const userParam = params.get('user');
        if (!userParam) {
            return res.status(400).json({ error: 'No user data in initData' });
        }

        const tgUser = JSON.parse(userParam);

        const telegramId = tgUser.id;
        const uid = `tg_${telegramId}`;
        const now = admin.firestore.FieldValue.serverTimestamp();

        const userRef = firestore.collection('users').doc(uid);

        await userRef.set(
            {
                telegram_id: telegramId,
                username: tgUser.username || null,
                firstName: tgUser.first_name || '',
                photoUrl: tgUser.photo_url || null,
                lastLogin: now,
                createdAt: now,
            },
            { merge: true }
        );

        const customToken = await admin.auth().createCustomToken(uid, {
            telegram_id: telegramId,
            username: tgUser.username || null,
        });

        res.json({ token: customToken });
    } catch (err) {
        console.error('Telegram auth error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===================================================================
// 2) ЛОГИН ЧЕРЕЗ БРАУЗЕР С КОДОМ
// ===================================================================

// 2.1. Браузер просит создать одноразовый код
// POST /auth/browser/start  -> { code }
app.post('/auth/browser/start', async (req, res) => {
    try {
        const code = generateCode(6);

        const linkRef = firestore.collection('auth_links').doc(code);
        await linkRef.set({
            code,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ code });
    } catch (err) {
        console.error('browser/start error', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// 2.2. Бот подтверждает код и пользователя
// POST /auth/browser/confirm  { code, user, secret }
app.post('/auth/browser/confirm', async (req, res) => {
    try {
        const { code, user, secret } = req.body;

        if (!code || !user || !secret) {
            return res
                .status(400)
                .json({ error: 'code, user and secret are required' });
        }

        if (!BROWSER_AUTH_SECRET || secret !== BROWSER_AUTH_SECRET) {
            return res.status(403).json({ error: 'invalid secret' });
        }

        const linkRef = firestore.collection('auth_links').doc(code);
        const linkSnap = await linkRef.get();

        if (!linkSnap.exists) {
            return res.status(404).json({ error: 'code not found' });
        }

        const linkData = linkSnap.data();
        if (linkData.status !== 'pending') {
            return res
                .status(400)
                .json({ error: 'code already used or invalid' });
        }

        const telegramId = user.id;
        const uid = `tg_${telegramId}`;
        const username = user.username || null;
        const firstName = user.first_name || '';
        const photoUrl = user.photo_url || null;

        const now = admin.firestore.FieldValue.serverTimestamp();
        const userRef = firestore.collection('users').doc(uid);

        await userRef.set(
            {
                telegram_id: telegramId,
                username,
                firstName,
                photoUrl,
                lastLogin: now,
                createdAt: now,
            },
            { merge: true }
        );

        const customToken = await admin.auth().createCustomToken(uid, {
            telegram_id: telegramId,
            username,
        });

        await linkRef.set(
            {
                status: 'linked',
                uid,
                token: customToken,
            },
            { merge: true }
        );

        res.json({ ok: true });
    } catch (err) {
        console.error('browser/confirm error', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Бот регистрирует пользователя без браузерного логина
app.post("/auth/bot/register", async (req, res) => {
    try {
        const { user, secret } = req.body;
        if (!user || !secret) {
            return res.status(400).json({ error: "user and secret are required" });
        }
        if (!BROWSER_AUTH_SECRET || secret !== BROWSER_AUTH_SECRET) {
            return res.status(403).json({ error: "invalid secret" });
        }

        const telegramId = user.id;
        const uid = `tg_${telegramId}`;
        const username = user.username || null;
        const firstName = user.first_name || "";
        const photoUrl = user.photo_url || null;

        const now = admin.firestore.FieldValue.serverTimestamp();
        const userRef = firestore.collection("users").doc(uid);

        await userRef.set(
            {
                telegram_id: telegramId,
                username,
                firstName,
                photoUrl,
                lastLogin: now,
                createdAt: now,
            },
            { merge: true }
        );

        res.json({ ok: true });
    } catch (err) {
        console.error("bot/register error", err);
        res.status(500).json({ error: "Internal error" });
    }
});


// 2.3. Браузер опрашивает статус кода
// GET /auth/browser/poll?code=XXXX
app.get('/auth/browser/poll', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ error: 'code is required' });
        }

        const linkRef = firestore.collection('auth_links').doc(code);
        const snap = await linkRef.get();

        if (!snap.exists) {
            return res.json({ status: 'not_found' });
        }

        const data = snap.data();

        if (data.status !== 'linked') {
            return res.json({ status: data.status || 'pending' });
        }

        // Отдаём токен один раз и удаляем документ
        await linkRef.delete();

        return res.json({
            status: 'linked',
            token: data.token,
        });
    } catch (err) {
        console.error('browser/poll error', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// ===================================================================
// health-check
// ===================================================================
app.get('/', (req, res) => {
    res.send('LUdomania auth server is running');
});

app.listen(PORT, () => {
    console.log(`🚀 Auth server listening on port ${PORT}`);
});
