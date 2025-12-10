// backend/bot.js
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
require("dotenv").config();

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || "https://ludomania.onrender.com";
const SECRET      = process.env.BROWSER_AUTH_SECRET;

// URL фронта (миниапп + веб)
const WEBAPP_URL = "https://ludomania-app.vercel.app";

if (!BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN не задан");
    process.exit(1);
}
if (!SECRET) {
    console.warn("⚠️ BROWSER_AUTH_SECRET не задан — browser login работать не будет");
}

const bot = new Telegraf(BOT_TOKEN);

// ==============================
// Вспомогалки
// ==============================
async function confirmBrowserLogin(code, user) {
    try {
        const resp = await axios.post(`${BACKEND_URL}/auth/browser/confirm`, {
            code,
            user,
            secret: SECRET,
        });

        return resp.data?.ok === true;
    } catch (err) {
        console.error(
            "confirmBrowserLogin error:",
            err.response?.data || err.message || err
        );
        return false;
    }
}

async function registerUserInBackend(user) {
    if (!SECRET) return;

    try {
        await axios.post(`${BACKEND_URL}/auth/bot/register`, {
            user,
            secret: SECRET,
        });
    } catch (err) {
        console.error(
            "bot/register error:",
            err.response?.data || err.message || err
        );
    }
}

// ==============================
// /start
// ==============================
bot.start(async (ctx) => {
    const payload = ctx.startPayload; // если открыли с ?start=CODE

    // 1) если есть код из браузера → подтверждаем его
    if (payload) {
        const code = payload.trim();
        const ok   = await confirmBrowserLogin(code, ctx.from);

        if (ok) {
            return ctx.reply(
                "✅ Браузер успешно авторизован!\nВернись на сайт и продолжай игру 🎮"
            );
        } else {
            return ctx.reply("❌ Неверный или просроченный код. Попробуй ещё раз из браузера.");
        }
    }

    // 2) обычный /start без кода → регистрируем юзера и показываем кнопку
    await registerUserInBackend(ctx.from);

    return ctx.reply(
        "✅ Данные записаны.\nДобро пожаловать в LUdomania!",
        Markup.inlineKeyboard([
            Markup.button.webApp("🎮 Играть", WEBAPP_URL),
        ])
    );
});

// ==============================
// /login CODE — запасной вариант
// ==============================
bot.command("login", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);
    if (parts.length < 2) {
        return ctx.reply("Используй: /login КОД_ИЗ_БРАУЗЕРА");
    }

    const code = parts[1].trim();
    const ok   = await confirmBrowserLogin(code, ctx.from);

    if (ok) {
        return ctx.reply("✅ Код подтверждён! Возвращайся в браузер 🔥");
    }
    return ctx.reply("❌ Неверный или просроченный код.");
});

// ==============================
// Запуск
// ==============================
bot.launch().then(() => {
    console.log("🤖 LUdomania bot is running");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
