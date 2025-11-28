// backend/bot.js
const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const WEBAPP_URL = 'https://ludomania-app.vercel.app';

bot.start((ctx) => {
    return ctx.reply(
        'Добро пожаловать в LUdomania!',
        Markup.inlineKeyboard([
            Markup.button.webApp('🎮 Играть', WEBAPP_URL)
        ])
    );
});

bot.launch().then(() => {
    console.log('🤖 LUdomania bot is running');
});
