// src/games/mines.js
const API_BASE = window.__API_BASE__ || "https://161-97-99-137.sslip.io";

const GRID_SIZE   = 25; // 5x5
const MULTIPLIERS = [
    0, 1.05, 1.15, 1.30, 1.50, 1.75,
    2.10, 2.55, 3.15, 3.95, 5.00,
    6.40, 8.30, 10.9, 14.5, 19.5,
    26.5, 36.5, 51.0, 73.0, 107,
    161, 252, 420, 750, 1500,
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

    let gameId      = null;
    let revealed    = 0;
    let bet         = 0;
    let minesNum    = 3;
    let gameActive  = false;

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

    async function startGame() {
        bet     = parseInt(betInput.value, 10);
        minesNum = parseInt(minesCount.value, 10);

        if (!bet || bet <= 0) { resultEl.textContent = "Введи ставку!"; return; }
        if (bet > getBalance()) { resultEl.textContent = "Недостаточно LM!"; return; }
        if (minesNum < 1 || minesNum > 24) { resultEl.textContent = "Мин: от 1 до 24"; return; }

        try {
            const resp = await fetch(`${API_BASE}/game/mines/start`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await getToken()}`,
                },
                body: JSON.stringify({ bet, mines: minesNum }),
            });

            const data = await resp.json();
            if (!resp.ok) { resultEl.textContent = data.error || "Ошибка"; return; }

            gameId     = data.gameId;
            revealed   = 0;
            gameActive = true;

            buildGrid();
            updateMultiplier();

            startBtn.classList.add("hidden");
            cashoutBtn.classList.remove("hidden");
            resultEl.textContent = "Открывай клетки!";
            resultEl.className   = "mines-result";

            onBalanceChange(data.newBalance);
        } catch (err) {
            resultEl.textContent = "Ошибка сервера";
            console.error(err);
        }
    }

    async function revealCell(idx) {
        if (!gameActive) return;

        const cell = gridEl.querySelector(`[data-idx="${idx}"]`);
        if (!cell || cell.classList.contains("revealed") || cell.classList.contains("mine")) return;

        cell.classList.add("loading");

        try {
            const resp = await fetch(`${API_BASE}/game/mines/reveal`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await getToken()}`,
                },
                body: JSON.stringify({ gameId, cellIndex: idx }),
            });

            const data = await resp.json();
            cell.classList.remove("loading");

            if (data.isMine) {
                // Взрыв!
                cell.textContent = "💣";
                cell.classList.add("mine");
                gameActive = false;

                // Показываем все мины
                if (data.minePositions) {
                    data.minePositions.forEach(pos => {
                        const mineCell = gridEl.querySelector(`[data-idx="${pos}"]`);
                        if (mineCell) { mineCell.textContent = "💣"; mineCell.classList.add("mine"); }
                    });
                }

                resultEl.textContent = `💥 Взорвался! -${bet} LM`;
                resultEl.className   = "mines-result lose";
                cashoutBtn.classList.add("hidden");
                startBtn.classList.remove("hidden");
            } else {
                cell.textContent = "💎";
                cell.classList.add("revealed");
                revealed++;
                updateMultiplier();

                const mult   = MULTIPLIERS[revealed] || 1;
                const profit = Math.floor(bet * mult);
                resultEl.textContent = `Открыто: ${revealed} | Заберёшь: ${profit} LM`;

                // Если открыты все безопасные клетки
                if (revealed >= GRID_SIZE - minesNum) {
                    await cashout();
                }
            }
        } catch (err) {
            cell.classList.remove("loading");
            console.error(err);
        }
    }

    async function cashout() {
        if (!gameActive || !gameId) return;
        gameActive = false;

        try {
            const resp = await fetch(`${API_BASE}/game/mines/cashout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await getToken()}`,
                },
                body: JSON.stringify({ gameId }),
            });

            const data = await resp.json();
            resultEl.textContent = `🎉 +${data.payout} LM!`;
            resultEl.className   = "mines-result win";
            cashoutBtn.classList.add("hidden");
            startBtn.classList.remove("hidden");
            onBalanceChange(data.newBalance);
        } catch (err) {
            console.error(err);
        }
    }

    startBtn.addEventListener("click", startGame);
    cashoutBtn.addEventListener("click", cashout);
    closeBtn.addEventListener("click",  () => overlay.classList.add("hidden"));

    return {
        open: () => {
            overlay.classList.remove("hidden");
            gameActive = false;
            gameId     = null;
            buildGrid();
            startBtn.classList.remove("hidden");
            cashoutBtn.classList.add("hidden");
            resultEl.textContent = "";
            if (multEl) multEl.textContent = "1.00x";
        },
    };
}