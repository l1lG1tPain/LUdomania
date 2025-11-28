// backend/bot.js
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// URL фронта (миниапп + веб)
const WEBAPP_URL = "https://ludomania-app.vercel.app";

// URL бекенда (Render)
const BACKEND_URL = "https://ludomania.onrender.com";   // 🔥 поменяй на свой актуальный URL

const SECRET = process.env.BROWSER_AUTH_SECRET;

// ==============================
// Функция подтверждения кода
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
        console.error("confirmBrowserLogin error:", err.response?.data || err);
        return false;
    }
}

// ==============================
// Команда /start (поддержка ?start=code)
// ==============================
bot.start(async (ctx) => {
    const startPayload = ctx.startPayload;

    if (startPayload) {
        const code = startPayload.trim();
        const ok = await confirmBrowserLogin(code, ctx.from);

        if (ok) {
            return ctx.reply(
                "✅ Браузер успешно авторизован!\nТеперь вернись на сайт, чтобы продолжить игру 🎮"
            );
        } else {
            return ctx.reply("❌ Неверный или просроченный код.");
        }
    }

    // ⬇️ регистрируем юзера просто по факту /start
    try {
        await axios.post(`${BACKEND_URL}/auth/bot/register`, {
            user: ctx.from,
            secret: SECRET,
        });
    } catch (e) {
        console.error("bot register error", e.response?.data || e);
    }

    return ctx.reply(
        "Добро пожаловать в LUdomania!",
        Markup.inlineKeyboard([
            Markup.button.webApp("🎮 Играть", WEBAPP_URL),
        ])
    );
});


// ==============================
// Альтернативная команда: /login CODE
// ==============================
bot.command("login", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);
    if (parts.length < 2) {
        return ctx.reply("Используй: /login CODE");
    }

    const code = parts[1];

    const ok = await confirmBrowserLogin(code, ctx.from);

    if (ok) {
        return ctx.reply("✅ Код подтверждён! Возвращайся в браузер 🔥");
    }

    ctx.reply("❌ Неверный или просроченный код.");
});

// ==============================
// Запуск бота
// ==============================
bot.launch().then(() => {
    console.log("🤖 LUdomania bot is running");
});

// Безопасное завершение
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
