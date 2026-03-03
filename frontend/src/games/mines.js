// src/games/mines.js
const API_BASE = window.__API_BASE__ || "https://161-97-99-137.sslip.io";

const GRID_SIZE   = 25; // 5x5
const MULTIPLIERS = [
    0, 1.00, 1.09, 1.24, 1.42, 1.66,
    1.99, 2.42, 2.99, 3.75, 4.74,
    6.08, 7.90, 10.3, 13.8, 18.5,
    25.2, 34.7, 48.4, 69.3, 102,
    153, 239, 399, 713, 1426,
];

export function initMines({ getBalance, getToken, onBalanceChange }) {
    const overlay    = document.getElementById("minesOverlay");
    const closeBtn   = document.getElementById("minesClose");
    const betInput   = document.getElementById("minesBet");
    const minesCount = document.getElementById("minesMinesCount");
    const startBtn   = document.getElementById("minesStartBtn");
    const cashoutBtn = document.getElementById("minesCashoutBtn");
    const gridEl     = document.getElementById("minesGrid");
    const resultEl   = document.getElementById("minesResult");
    const multEl     = document.getElementById("minesMultiplier");

    if (!overlay) return;

    let gameId     = null;
    let revealed   = 0;
    let bet        = 0;
    let minesNum   = 3;
    let gameActive = false;

    function buildGrid() {
        gridEl.innerHTML = "";
        for (let i = 0; i < GRID_SIZE; i++) {
            const cell = document.createElement("button");
            cell.className   = "mines-cell";
            cell.dataset.idx = i;
            cell.textContent = "💎";
            cell.addEventListener("click", () => revealCell(i));
            gridEl.appendChild(cell);
        }
    }

    function updateMultiplier() {
        const mult = MULTIPLIERS[revealed] || 1;
        if (multEl) multEl.textContent = `${mult.toFixed(2)}x`;
    }

    function setResult(text, type = "") {
        resultEl.textContent = text;
        resultEl.className   = `mines-result${type ? " " + type : ""}`;
    }

    async function startGame() {
        bet      = parseInt(betInput.value, 10);
        minesNum = parseInt(minesCount.value, 10);

        if (!bet || bet <= 0)              { setResult("Введи ставку!"); return; }
        if (bet > getBalance())            { setResult("Недостаточно LM!"); return; }
        if (minesNum < 1 || minesNum > 24) { setResult("Мин: от 1 до 24"); return; }

        startBtn.disabled = true;
        setResult("Начинаем...");

        let data = null;
        let fetchError = false;

        try {
            const resp = await fetch(`${API_BASE}/game/mines/start`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await getToken()}`,
                },
                body: JSON.stringify({ bet, mines: minesNum }),
            });
            data = await resp.json();
            if (!resp.ok) fetchError = true;
        } catch (err) {
            console.error("mines/start fetch error:", err);
            fetchError = true;
        }

        if (fetchError || !data) {
            startBtn.disabled = false;
            setResult("Ошибка сервера 😢", "lose");
            return;
        }

        startBtn.disabled = false;
        gameId     = data.gameId;
        revealed   = 0;
        gameActive = true;

        buildGrid();
        updateMultiplier();

        startBtn.classList.add("hidden");
        cashoutBtn.classList.remove("hidden");
        setResult("Открывай клетки!");

        if (data.newBalance != null) onBalanceChange(data.newBalance);
    }

    async function revealCell(idx) {
        if (!gameActive) return;

        const cell = gridEl.querySelector(`[data-idx="${idx}"]`);
        if (!cell || cell.classList.contains("revealed") || cell.classList.contains("mine")) return;

        // Блокируем всю сетку на время запроса
        gridEl.querySelectorAll(".mines-cell").forEach(c => c.disabled = true);
        cell.classList.add("loading");

        let data = null;
        let fetchError = false;

        try {
            const resp = await fetch(`${API_BASE}/game/mines/reveal`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await getToken()}`,
                },
                body: JSON.stringify({ gameId, cellIndex: idx }),
            });
            data = await resp.json();
            if (!resp.ok) fetchError = true;
        } catch (err) {
            console.error("mines/reveal fetch error:", err);
            fetchError = true;
        }

        cell.classList.remove("loading");

        if (fetchError || !data) {
            // Разблокируем сетку — игра продолжается
            gridEl.querySelectorAll(".mines-cell:not(.revealed):not(.mine)")
                .forEach(c => c.disabled = false);
            setResult("Ошибка соединения, попробуй ещё раз 😢", "lose");
            return;
        }

        if (data.isMine) {
            cell.textContent = "💣";
            cell.classList.add("mine");
            gameActive = false;

            if (data.minePositions) {
                data.minePositions.forEach(pos => {
                    const mc = gridEl.querySelector(`[data-idx="${pos}"]`);
                    if (mc) { mc.textContent = "💣"; mc.classList.add("mine"); }
                });
            }

            gridEl.querySelectorAll(".mines-cell").forEach(c => c.disabled = true);
            setResult(`💥 Взорвался! -${bet} LM`, "lose");
            cashoutBtn.classList.add("hidden");
            startBtn.classList.remove("hidden");
        } else {
            cell.textContent = "💎";
            cell.classList.add("revealed");
            revealed++;
            updateMultiplier();

            const mult   = MULTIPLIERS[revealed] || 1;
            const profit = Math.floor(bet * mult);
            setResult(`Открыто: ${revealed} | Заберёшь: ${profit} LM`);

            gridEl.querySelectorAll(".mines-cell:not(.revealed):not(.mine)")
                .forEach(c => c.disabled = false);

            // Все безопасные клетки открыты — автокэшаут
            if (revealed >= GRID_SIZE - minesNum) {
                await cashout();
            }
        }
    }

    async function cashout() {
        if (!gameActive || !gameId) return;
        gameActive = false;

        cashoutBtn.disabled = true;
        gridEl.querySelectorAll(".mines-cell").forEach(c => c.disabled = true);

        let data = null;
        let fetchError = false;

        try {
            const resp = await fetch(`${API_BASE}/game/mines/cashout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await getToken()}`,
                },
                body: JSON.stringify({ gameId }),
            });
            data = await resp.json();
            if (!resp.ok) fetchError = true;
        } catch (err) {
            console.error("mines/cashout fetch error:", err);
            fetchError = true;
        }

        try {
            if (fetchError || !data) {
                setResult("Ошибка при получении выигрыша 😢", "lose");
            } else {
                setResult(`🎉 +${data.payout} LM! (×${data.multiplier?.toFixed(2)})`, "win");
                if (data.newBalance != null) onBalanceChange(data.newBalance);
            }
        } finally {
            cashoutBtn.disabled = false;
            cashoutBtn.classList.add("hidden");
            startBtn.classList.remove("hidden");
        }
    }

    startBtn.addEventListener("click", startGame);
    cashoutBtn.addEventListener("click", cashout);
    closeBtn.addEventListener("click", () => {
        if (gameActive) {
            if (!confirm("Уйти? Текущая ставка сгорит!")) return;
            gameActive = false;
        }
        overlay.classList.add("hidden");
    });

    return {
        open: () => {
            overlay.classList.remove("hidden");
            gameActive = false;
            gameId     = null;
            buildGrid();
            startBtn.classList.remove("hidden");
            startBtn.disabled = false;
            cashoutBtn.classList.add("hidden");
            setResult("");
            if (multEl) multEl.textContent = "1.00x";
        },
    };
}