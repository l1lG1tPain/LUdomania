// backend/server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const admin = require('firebase-admin');
require('dotenv').config();

// ==== Game config (Машины, призы, рарности) ====
const { MACHINES, PRIZES, RARITY_META } = require('./gameConfig');

// ==== Утилита генерации короткого кода для браузерной авторизации ====
function generateCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < length; i++) {
        res += chars[Math.floor(Math.random() * chars.length)];
    }
    return res;
}

// ==== AkulkaID: глобальный идентификатор пользователя во вселенной Акулки ====
const AKULKA_ID_SECRET = process.env.AKULKA_ID_SECRET || 'fallback-secret';

function makeAkulkaId(telegramId) {
    const raw = crypto
        .createHmac('sha256', AKULKA_ID_SECRET)
        .update(String(telegramId))
        .digest('base64url');

    const clean = raw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return clean.slice(0, 6) || 'akulka';
}

const app = express();
app.use(express.json());

app.use(
    cors({
        origin: [
            'http://localhost:5173',
            'https://ludomania-app.vercel.app',
        ],
        methods: ['GET', 'POST', 'OPTIONS'],
    })
);

// ==== Firebase Admin init ====
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
    serviceAccount = require('./serviceAccountKey.json');
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const firestore  = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ==== Config ====
const BOT_TOKEN           = process.env.TELEGRAM_BOT_TOKEN;
const BROWSER_AUTH_SECRET = process.env.BROWSER_AUTH_SECRET;
const PORT                = process.env.PORT || 3000;

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

        const params    = new URLSearchParams(initData);
        const userParam = params.get('user');
        if (!userParam) {
            return res.status(400).json({ error: 'No user data in initData' });
        }

        const tgUser = JSON.parse(userParam);

        const telegramId = tgUser.id;
        const uid        = `tg_${telegramId}`;
        const akulkaId   = makeAkulkaId(telegramId);
        const now        = FieldValue.serverTimestamp();

        const userRef = firestore.collection('users').doc(uid);

        await userRef.set(
            {
                telegram_id: telegramId,
                akulkaId,
                username:  tgUser.username || null,
                firstName: tgUser.first_name || '',
                photoUrl:  tgUser.photo_url || null,
                lastLogin: now,
                createdAt: now,
            },
            { merge: true }
        );

        const customToken = await admin.auth().createCustomToken(uid, {
            telegram_id: telegramId,
            akulkaId,
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

app.post('/auth/browser/start', async (req, res) => {
    try {
        const code = generateCode(6);

        const linkRef = firestore.collection('auth_links').doc(code);
        await linkRef.set({
            code,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
        });

        res.json({ code });
    } catch (err) {
        console.error('browser/start error', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

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

        const linkRef  = firestore.collection('auth_links').doc(code);
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
        const uid        = `tg_${telegramId}`;
        const akulkaId   = makeAkulkaId(telegramId);
        const username   = user.username || null;
        const firstName  = user.first_name || '';
        const photoUrl   = user.photo_url || null;

        const now     = FieldValue.serverTimestamp();
        const userRef = firestore.collection('users').doc(uid);

        await userRef.set(
            {
                telegram_id: telegramId,
                akulkaId,
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
            akulkaId,
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

app.post('/auth/bot/register', async (req, res) => {
    try {
        const { user, secret } = req.body;
        if (!user || !secret) {
            return res.status(400).json({ error: 'user and secret are required' });
        }
        if (!BROWSER_AUTH_SECRET || secret !== BROWSER_AUTH_SECRET) {
            return res.status(403).json({ error: 'invalid secret' });
        }

        const telegramId = user.id;
        const uid        = `tg_${telegramId}`;
        const akulkaId   = makeAkulkaId(telegramId);
        const username   = user.username || null;
        const firstName  = user.first_name || "";
        const photoUrl   = user.photo_url || null;

        const now     = FieldValue.serverTimestamp();
        const userRef = firestore.collection("users").doc(uid);

        await userRef.set(
            {
                telegram_id: telegramId,
                akulkaId,
                username,
                firstName,
                photoUrl,
                lastLogin: now,
                createdAt: now,
            },
            { merge: true }
        );

        return res.json({ ok: true });
    } catch (err) {
        console.error("bot/register error", err);
        return res.status(500).json({ error: "Internal error" });
    }
});

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
// 3) ЛОГИКА СПИНА АВТОМАТА — POST /spin
// ===================================================================

function getPrizeWeight(prizeId) {
    const prize = PRIZES[prizeId];
    if (!prize) return 1;

    if (typeof prize.dropWeight === 'number' && prize.dropWeight > 0) {
        return prize.dropWeight;
    }
    const rarityKey  = prize.rarity || 'common';
    const rarityMeta = RARITY_META[rarityKey] || {};
    if (typeof rarityMeta.weight === 'number' && rarityMeta.weight > 0) {
        return rarityMeta.weight;
    }
    return 1;
}

function rollPrizeForMachine(machine) {
    if (!machine || !Array.isArray(machine.prizePool) || machine.prizePool.length === 0) {
        return null;
    }

    const entries = machine.prizePool
        .map((id) => ({ id, weight: getPrizeWeight(id) }))
        .filter((e) => e.weight > 0);

    const total = entries.reduce((sum, e) => sum + e.weight, 0);
    if (!total) {
        return machine.prizePool[Math.floor(Math.random() * machine.prizePool.length)];
    }

    let r = Math.random() * total;
    for (const e of entries) {
        if (r < e.weight) return e.id;
        r -= e.weight;
    }
    return entries[entries.length - 1].id;
}

// ---- буфер для глобальной статистики автоматов ----
const machineStatsBuffer = new Map(); // machineId -> { spinsDelta, winsDelta }
let machineStatsFlushTimer = null;

function bufferGlobalMachineStats(machineId, win) {
    let entry = machineStatsBuffer.get(machineId);
    if (!entry) {
        entry = { spinsDelta: 0, winsDelta: 0 };
        machineStatsBuffer.set(machineId, entry);
    }
    entry.spinsDelta += 1;
    if (win) entry.winsDelta += 1;
}

async function flushGlobalMachineStats(reason = 'timer') {
    if (machineStatsBuffer.size === 0) {
        machineStatsFlushTimer = null;
        return;
    }

    const batch = firestore.batch();

    machineStatsBuffer.forEach((entry, machineId) => {
        const ref = firestore.collection('machine_stats').doc(machineId);
        batch.set(
            ref,
            {
                totalSpins: FieldValue.increment(entry.spinsDelta),
                totalWins:  FieldValue.increment(entry.winsDelta),
            },
            { merge: true }
        );
    });

    machineStatsBuffer.clear();
    machineStatsFlushTimer = null;

    try {
        await batch.commit();
    } catch (err) {
        console.error('flushGlobalMachineStats error', reason, err);
    }
}

function scheduleGlobalMachineStatsFlush() {
    if (machineStatsFlushTimer) return;
    machineStatsFlushTimer = setTimeout(() => {
        flushGlobalMachineStats('timer');
    }, 1500);
}

// на всякий случай — попытаться слить буфер при остановке процесса
process.on('SIGINT', async () => {
    await flushGlobalMachineStats('SIGINT');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await flushGlobalMachineStats('SIGTERM');
    process.exit(0);
});

async function grantPrizeWithGlobalLimit(uid, machine) {
    const pool = Array.isArray(machine.prizePool) ? machine.prizePool.slice() : [];
    if (!pool.length) return { outcome: 'no-prize' };

    const tried = new Set();

    while (tried.size < pool.length) {
        const candidateId = rollPrizeForMachine(machine);
        if (!candidateId || tried.has(candidateId)) continue;
        tried.add(candidateId);

        const cfg = PRIZES[candidateId];
        if (!cfg) continue;

        const maxGlobal = cfg.maxCopiesGlobal ?? Infinity;

        // безлимитный приз
        if (!Number.isFinite(maxGlobal)) {
            const invRef = firestore
                .collection('users')
                .doc(uid)
                .collection('inventory')
                .doc(cfg.id);

            await invRef.set(
                {
                    prizeId:   cfg.id,
                    name:      cfg.name,
                    emoji:     cfg.emoji,
                    rarity:    cfg.rarity,
                    value:     cfg.value,
                    createdAt: FieldValue.serverTimestamp(),
                    count:     FieldValue.increment(1),
                },
                { merge: true }
            );

            return { outcome: 'win', prize: cfg };
        }

        // лимитированный приз — транзакция prize_counters + inventory
        try {
            const txResult = await firestore.runTransaction(async (tx) => {
                const counterRef  = firestore.collection('prize_counters').doc(cfg.id);
                const counterSnap = await tx.get(counterRef);
                const data        = counterSnap.exists ? counterSnap.data() : {};
                const used        = data && typeof data.count === 'number' ? data.count : 0;

                if (Number.isFinite(maxGlobal) && used >= maxGlobal) {
                    return { outcome: 'exhausted' };
                }

                const invRef   = firestore.collection('users').doc(uid).collection('inventory').doc(cfg.id);
                const invSnap  = await tx.get(invRef);
                const prevData = invSnap.exists ? invSnap.data() : {};
                const prevCnt  = prevData && typeof prevData.count === 'number' ? prevData.count : 0;

                tx.set(
                    counterRef,
                    { count: used + 1 },
                    { merge: true }
                );

                tx.set(
                    invRef,
                    {
                        prizeId:   cfg.id,
                        name:      cfg.name,
                        emoji:     cfg.emoji,
                        rarity:    cfg.rarity,
                        value:     cfg.value,
                        createdAt: prevData.createdAt || FieldValue.serverTimestamp(),
                        count:     prevCnt + 1,
                    },
                    { merge: true }
                );

                return { outcome: 'win', prize: cfg };
            });

            if (txResult.outcome === 'win') {
                return txResult;
            }
            if (txResult.outcome === 'exhausted') {
                continue;
            }

            return { outcome: 'error' };
        } catch (err) {
            console.error('grantPrizeWithGlobalLimit tx error', err);

            if (
                err.code === 'resource-exhausted' ||
                (typeof err.message === 'string' && err.message.includes('Quota exceeded'))
            ) {
                const invRef = firestore
                    .collection('users')
                    .doc(uid)
                    .collection('inventory')
                    .doc(cfg.id);

                await invRef.set(
                    {
                        prizeId:   cfg.id,
                        name:      cfg.name,
                        emoji:     cfg.emoji,
                        rarity:    cfg.rarity,
                        value:     cfg.value,
                        createdAt: FieldValue.serverTimestamp(),
                        count:     FieldValue.increment(1),
                    },
                    { merge: true }
                );

                return { outcome: 'win', prize: cfg };
            }

            return { outcome: 'error' };
        }
    }

    return { outcome: 'no-prize' };
}

app.post('/spin', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token      = authHeader.startsWith('Bearer ')
            ? authHeader.slice('Bearer '.length)
            : null;

        if (!token) {
            return res.status(401).json({ outcome: 'no-auth', error: 'Missing Bearer token' });
        }

        const decoded = await admin.auth().verifyIdToken(token);
        const uid     = decoded.uid;

        const { machineId } = req.body;
        if (!machineId) {
            return res.status(400).json({ outcome: 'error', error: 'machineId is required' });
        }

        const machine = MACHINES.find((m) => m.id === machineId);
        if (!machine) {
            return res.status(404).json({ outcome: 'error', error: 'machine not found' });
        }

        const userRef  = firestore.collection('users').doc(uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return res.status(404).json({ outcome: 'error', error: 'user not found' });
        }

        const user   = userSnap.data();
        const level  = user.level ?? 0;
        const price  = machine.price ?? 0;
        const minLvl = machine.minLevel ?? 0;
        const bal    = user.balance ?? 0;

        if (level < minLvl) {
            return res.status(400).json({
                outcome: 'locked',
                message: `Этот автомат доступен с ${minLvl}-го уровня`,
            });
        }

        if (bal < price) {
            return res.status(400).json({
                outcome: 'no-money',
                message: 'Не хватает ЛудоМани для этой игры 🪙',
            });
        }

        // списываем баланс
        await userRef.update({
            balance:    FieldValue.increment(-price),
            totalSpent: FieldValue.increment(price),
        });

        const win = Math.random() < (machine.winChance || 0);

        // глобальная статистика — через буфер
        bufferGlobalMachineStats(machineId, win);
        scheduleGlobalMachineStatsFlush();

        // пользовательская статистика — сразу
        const userStatRef = userRef.collection('machineStats').doc(machineId);
        await userStatRef.set(
            {
                spins: FieldValue.increment(1),
                wins:  win ? FieldValue.increment(1) : FieldValue.increment(0),
            },
            { merge: true }
        );

        if (!win) {
            return res.json({ outcome: 'lose' });
        }

        const prizeResult = await grantPrizeWithGlobalLimit(uid, machine);

        if (prizeResult.outcome === 'win' && prizeResult.prize) {
            return res.json({
                outcome: 'win',
                prize: prizeResult.prize,
            });
        }

        if (prizeResult.outcome === 'no-prize') {
            return res.json({
                outcome: 'no-prize',
                message: 'Все призы этого автомата уже разобрали 😢',
            });
        }

        return res.status(500).json({ outcome: 'error', error: 'Prize error' });
    } catch (err) {
        console.error('/spin error', err);
        return res.status(500).json({ outcome: 'error', error: 'Internal error' });
    }
});

// ===================================================================
// health-check
// ===================================================================
app.get('/', (req, res) => {
    res.send('LUdomania auth/spin server is running');
});

app.listen(PORT, () => {
    console.log(`🚀 Auth server listening on port ${PORT}`);
});
