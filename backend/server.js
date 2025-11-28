const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use(cors({
    origin: [
        'http://localhost:5173',           // Vite Dev
        'https://ludomania.vercel.app'     // прод (добавишь позже)
    ],
    methods: ['POST', 'GET', 'OPTIONS']
}));

// ==== Firebase Admin ====
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 3000;

// === Проверка подписи ===
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

// === /auth/telegram ===
app.post('/auth/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) return res.status(400).json({ error: "initData missing" });

        if (!checkTelegramAuth(initData)) {
            return res.status(401).json({ error: "Invalid Telegram auth" });
        }

        const params = new URLSearchParams(initData);
        const userParam = params.get("user");
        if (!userParam) return res.status(400).json({ error: "No user param" });

        const tgUser = JSON.parse(userParam);
        const telegramId = tgUser.id;
        const uid = `tg_${telegramId}`;

        const userRef = firestore.collection("users").doc(uid);
        const now = admin.firestore.FieldValue.serverTimestamp();

        await userRef.set({
            telegram_id: telegramId,
            username: tgUser.username || null,
            firstName: tgUser.first_name || "",
            photoUrl: tgUser.photo_url || null,
            lastLogin: now,
            createdAt: now
        }, { merge: true });

        const customToken = await admin.auth().createCustomToken(uid, {
            telegram_id: telegramId
        });

        res.json({ token: customToken });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// === health ===
app.get('/', (req, res) => {
    res.send("LUdomania Auth Server Running");
});

// === start ===
app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});
