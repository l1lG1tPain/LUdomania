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
    collection,
    addDoc,
    deleteDoc,
} from "firebase/firestore";
import { MACHINES, PRIZES, randomFrom } from "./gameConfig.js";

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
const machinesEl    = document.getElementById("machines");
const inventoryEl   = document.getElementById("inventory");

let userRef    = null;
let uid        = null;
let clickPower = 1;
let balance    = 0;
let authInProgress = false;

// === Утилиты ===
function getUpgradeCost(power) {
    return Math.round(10 * Math.pow(power, 1.5));
}

function updateUpgradeUI() {
    const cost = getUpgradeCost(clickPower);
    upgradeCostEl.textContent = cost;
    upgradeBtn.disabled = balance < cost;
}

// === Рендер автоматов ===
function renderMachines() {
    machinesEl.innerHTML = "";

    MACHINES.forEach((m) => {
        const div = document.createElement("div");
        div.className = "machine-card";

        div.innerHTML = `
      <div class="machine-header">
        <span class="machine-name">${m.name}</span>
        <span class="machine-meta">${m.price} LM / попытка</span>
      </div>
      <div class="machine-meta">Шанс: ${(m.winChance * 100).toFixed(0)}%</div>
      <div class="machine-meta">${m.description}</div>
      <button class="btn secondary machine-play" data-id="${m.id}">
        Крутить
      </button>
    `;

        machinesEl.appendChild(div);
    });

    machinesEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".machine-play");
        if (!btn) return;
        const id = btn.dataset.id;
        playMachine(id);
    });
}

// === Инвентарь ===
function renderInventory(items) {
    inventoryEl.innerHTML = "";

    if (items.length === 0) {
        inventoryEl.textContent = "Пока пусто. Выбей что-нибудь из автомата 🎰";
        return;
    }

    items.forEach((item) => {
        const div = document.createElement("div");
        div.className = "inv-item";

        const rarityLabels = {
            common: "Обычный",
            rare: "Редкий",
            epic: "Эпический",
            legendary: "Легендарный",
        };

        div.innerHTML = `
      <div class="inv-main">
        <span class="inv-emoji">${item.emoji}</span>
        <div>
          <div class="inv-name">${item.name}</div>
          <div class="inv-rarity">
            ${rarityLabels[item.rarity] ?? item.rarity} • ${item.value} LM
          </div>
        </div>
      </div>
      <div class="inv-actions">
        <button class="btn primary inv-sell" data-id="${item.id}">
          Продать
        </button>
      </div>
    `;

        inventoryEl.appendChild(div);
    });

    inventoryEl.addEventListener("click", async (e) => {
        const btn = e.target.closest(".inv-sell");
        if (!btn) return;

        const itemId = btn.dataset.id;
        const item   = items.find((it) => it.id === itemId);
        if (!item) return;

        const confirmSell = confirm(
            `Продать "${item.name}" за ${item.value} ЛудоМани?`
        );
        if (!confirmSell) return;

        await sellItem(item);
    });
}

// Подписка на инвентарь
function subscribeToInventory(uid) {
    const invCol = collection(db, "users", uid, "inventory");

    onSnapshot(invCol, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderInventory(items);
    });
}

// === Гарантируем игровые поля ===
async function ensureGameFields(uid, telegramInfo) {
    const ref  = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, {
            telegram_id: telegramInfo?.id ?? null,
            username:    telegramInfo?.username ?? null,
            firstName:   telegramInfo?.first_name ?? "",
            photoUrl:    telegramInfo?.photo_url ?? null,
            createdAt:   serverTimestamp(),
            lastLogin:   serverTimestamp(),
            balance:     0,
            clickPower:  1,
            totalClicks: 0,
            totalEarned: 0,
            totalSpent:  0,
        });
    } else {
        const data = snap.data();
        const patch = {};
        if (data.balance      === undefined) patch.balance      = 0;
        if (data.clickPower   === undefined) patch.clickPower   = 1;
        if (data.totalClicks  === undefined) patch.totalClicks  = 0;
        if (data.totalEarned  === undefined) patch.totalEarned  = 0;
        if (data.totalSpent   === undefined) patch.totalSpent   = 0;

        if (Object.keys(patch).length > 0) {
            await updateDoc(ref, patch);
        }
    }
}

// === Кликер ===
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

// === Апгрейд ===
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
            balance:    increment(-cost),
            clickPower: increment(1),
            totalSpent: increment(cost),
        });
    } catch (e) {
        console.error("upgrade error", e);
    } finally {
        upgradeBtn.disabled = false;
    }
}

// === Играть в автомат ===
async function playMachine(machineId) {
    if (!userRef) return;

    const machine = MACHINES.find((m) => m.id === machineId);
    if (!machine) return;

    if (balance < machine.price) {
        alert("Не хватает ЛудоМани для этого автомата 🪙");
        return;
    }

    // Списываем ставку
    try {
        await updateDoc(userRef, {
            balance:    increment(-machine.price),
            totalSpent: increment(machine.price),
        });
    } catch (e) {
        console.error("play: balance update error", e);
        return;
    }

    // Рандом: выигрыш/проигрыш
    const roll = Math.random();
    const win  = roll < machine.winChance;

    if (!win) {
        alert("Не повезло, игрушка выскользнула из лапы 😢");
        return;
    }

    // Выбираем случайный приз из пула автомата
    const prizeId = randomFrom(machine.prizePool);
    const prizeTemplate = PRIZES[prizeId];

    if (!prizeTemplate) {
        console.error("Unknown prizeId", prizeId);
        return;
    }

    const invCol = collection(db, "users", uid, "inventory");

    try {
        await addDoc(invCol, {
            prizeId: prizeTemplate.id,
            name: prizeTemplate.name,
            emoji: prizeTemplate.emoji,
            rarity: prizeTemplate.rarity,
            value: prizeTemplate.value,
            createdAt: serverTimestamp(),
        });

        alert(`Ты вытащил: ${prizeTemplate.emoji} ${prizeTemplate.name}!`);
    } catch (e) {
        console.error("add prize error", e);
    }
}

// === Продажа предмета ===
async function sellItem(item) {
    if (!userRef || !uid) return;

    const invDocRef = doc(db, "users", uid, "inventory", item.id);

    try {
        await deleteDoc(invDocRef);
        await updateDoc(userRef, {
            balance:    increment(item.value),
            totalEarned: increment(item.value),
        });
    } catch (e) {
        console.error("sell error", e);
    }
}

// === Авторизация через Telegram ===
async function loginWithTelegram() {
    if (authInProgress) return;
    authInProgress = true;

    try {
        if (!window.Telegram || !window.Telegram.WebApp) {
            alert("Эта авторизация работает внутри Telegram miniapp 🧩");
            authInProgress = false;
            return;
        }

        loginBtn.disabled = true;
        statusEl.textContent = "Авторизация...";

        const tg       = window.Telegram.WebApp;
        const initData = tg.initData;
        const unsafe   = tg.initDataUnsafe;

        if (!initData) {
            alert("Telegram не передал initData");
            loginBtn.disabled = false;
            authInProgress = false;
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
            authInProgress = false;
            return;
        }

        const { token } = await resp.json();

        const cred = await signInWithCustomToken(auth, token);
        uid        = cred.user.uid;

        await ensureGameFields(uid, unsafe?.user);

        statusEl.textContent = `Авторизован как ${unsafe?.user?.first_name ?? "игрок"}`;
        loginBtn.classList.add("hidden");
        gameEl.classList.remove("hidden");

        userRef = doc(db, "users", uid);

        // Подписки
        subscribeToUser(uid);
        subscribeToInventory(uid);

        renderMachines();

        window.Telegram.WebApp.ready();
    } catch (err) {
        console.error("Auth exception:", err);
        alert("Что-то пошло не так");
        loginBtn.disabled = false;
    } finally {
        authInProgress = false;
    }
}

loginBtn.addEventListener("click", loginWithTelegram);
clickBtn.addEventListener("click", handleClick);
upgradeBtn.addEventListener("click", handleUpgrade);

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    uid = user.uid;
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

    await ensureGameFields(uid, tgUser);
    statusEl.textContent = `Авторизован как ${tgUser?.first_name ?? "игрок"}`;
    loginBtn.classList.add("hidden");
    gameEl.classList.remove("hidden");

    userRef = doc(db, "users", uid);
    subscribeToUser(uid);
    subscribeToInventory(uid);
    renderMachines();
});

// авто-логин в миниаппе
if (window.Telegram && window.Telegram.WebApp) {
    loginWithTelegram();
}
