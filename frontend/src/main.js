// frontend/src/main.js
import { auth, db } from "./firebase.js";
import { signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    increment,
    serverTimestamp,
} from "firebase/firestore";

// DOM элементы
const loginBtn      = document.getElementById("login");
const statusEl      = document.getElementById("status");
const gameEl        = document.getElementById("game");
const balanceEl     = document.getElementById("balance");
const clickPowerEl  = document.getElementById("clickPower");
const totalClicksEl = document.getElementById("totalClicks");
const clickBtn      = document.getElementById("clickBtn");
const upgradeBtn    = document.getElementById("upgradeBtn");
const upgradeCostEl = document.getElementById("upgradeCost");

let userRef   = null;
let clickPower = 1;
let balance    = 0;

// Простая формула стоимости апгрейда
function getUpgradeCost(power) {
    // чем выше сила клика, тем дороже:
    // cost = 10 * power^1.5 (пример)
    return Math.round(10 * Math.pow(power, 1.5));
}

function updateUpgradeUI() {
    const cost = getUpgradeCost(clickPower);
    upgradeCostEl.textContent = cost;
    upgradeBtn.disabled = balance < cost;
}

// Подписка на изменения документа юзера в Firestore
function subscribeToUser(uid) {
    userRef = doc(db, "users", uid);

    onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        balance    = data.balance     ?? 0;
        clickPower = data.clickPower  ?? 1;
        const totalClicks = data.totalClicks ?? 0;

        balanceEl.textContent     = balance;
        clickPowerEl.textContent  = clickPower;
        totalClicksEl.textContent = totalClicks;

        updateUpgradeUI();
    });
}

// Гарантируем, что у юзера есть игровые поля (если backend создал только профиль)
async function ensureGameFields(uid, telegramInfo) {
    const ref  = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, {
            telegram_id: telegramInfo?.id ?? null,
            username: telegramInfo?.username ?? null,
            firstName: telegramInfo?.first_name ?? "",
            photoUrl: telegramInfo?.photo_url ?? null,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            balance: 0,
            clickPower: 1,
            totalClicks: 0,
            totalEarned: 0,
            totalSpent: 0,
        });
    } else {
        const data = snap.data();
        const patch = {};
        if (data.balance === undefined)    patch.balance    = 0;
        if (data.clickPower === undefined) patch.clickPower = 1;
        if (data.totalClicks === undefined) patch.totalClicks = 0;
        if (data.totalEarned === undefined) patch.totalEarned = 0;
        if (data.totalSpent === undefined) patch.totalSpent = 0;

        if (Object.keys(patch).length > 0) {
            await updateDoc(ref, patch);
        }
    }
}

// Клик добычи ЛудоМани
async function handleClick() {
    if (!userRef) return;
    clickBtn.disabled = true;
    try {
        await updateDoc(userRef, {
            balance:     increment(clickPower),
            totalClicks: increment(1),
            totalEarned: increment(clickPower),
        });
    } catch (e) {
        console.error("click error", e);
    } finally {
        clickBtn.disabled = false;
    }
}

// Апгрейд силы клика
async function handleUpgrade() {
    if (!userRef) return;

    const cost = getUpgradeCost(clickPower);
    if (balance < cost) {
        alert("Недостаточно ЛудоМани для апгрейда 💸");
        return;
    }

    upgradeBtn.disabled = true;

    try {
        await updateDoc(userRef, {
            balance:     increment(-cost),
            clickPower:  increment(1),
            totalSpent:  increment(cost),
        });
    } catch (e) {
        console.error("upgrade error", e);
    } finally {
        upgradeBtn.disabled = false;
    }
}

// Авторизация через Telegram WebApp + backend + Firebase
loginBtn.addEventListener("click", async () => {
    if (!window.Telegram || !window.Telegram.WebApp) {
        alert("Эта авторизация работает внутри Telegram miniapp 🧩");
        return;
    }

    try {
        loginBtn.disabled = true;
        statusEl.textContent = "Авторизация...";

        const tg = window.Telegram.WebApp;
        const initData = tg.initData;
        const unsafe   = tg.initDataUnsafe;

        if (!initData) {
            alert("Telegram не передал initData");
            loginBtn.disabled = false;
            return;
        }

        const resp = await fetch("https://ludomania.onrender.com/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
        });

        if (!resp.ok) {
            console.error("Auth error:", await resp.text());
            alert("Ошибка авторизации");
            loginBtn.disabled = false;
            return;
        }

        const { token } = await resp.json();

        const cred = await signInWithCustomToken(auth, token);
        const uid  = cred.user.uid;

        // Обновляем / создаём игровые поля
        await ensureGameFields(uid, unsafe?.user);

        statusEl.textContent = `Авторизован как ${unsafe?.user?.first_name ?? "игрок"}`;
        loginBtn.classList.add("hidden");
        gameEl.classList.remove("hidden");

        subscribeToUser(uid);
        window.Telegram.WebApp.ready();
    } catch (err) {
        console.error("Auth exception:", err);
        alert("Что-то пошло не так");
        loginBtn.disabled = false;
    }
});

// Лиснеры для кнопок игры
clickBtn.addEventListener("click", handleClick);
upgradeBtn.addEventListener("click", handleUpgrade);

// Если вдруг уже залогинен (например, страница обновилась внутри WebApp)
onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

    await ensureGameFields(user.uid, tgUser);
    statusEl.textContent = `Авторизован как ${tgUser?.first_name ?? "игрок"}`;
    loginBtn.classList.add("hidden");
    gameEl.classList.remove("hidden");
    subscribeToUser(user.uid);
});
