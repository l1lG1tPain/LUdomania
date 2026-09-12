// src/games/mines.js — ОБНОВЛЕННАЯ ВЕРСИЯ
// Теперь использует Firestore вместо Express API
// Работает как одностотовая игра (как автоматы)

const GRID_SIZE = 25; // 5x5

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

    let minesNum   = 3;
    let gameActive = false;
    let currentGameData = null;

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

    function updateMultiplier(revealedCount) {
        const MULTIPLIERS = [
            0, 1.00, 1.09, 1.24, 1.42, 1.66,
            1.99, 2.42, 2.99, 3.75, 4.74,
            6.08, 7.90, 10.3, 13.8, 18.5,
            25.2, 34.7, 48.4, 69.3, 102,
            153, 239, 399, 713, 1426,
        ];
        const mult = MULTIPLIERS[revealedCount] || 1;
        if (multEl) multEl.textContent = `${mult.toFixed(2)}x`;
    }

    function setResult(text, type = "") {
        resultEl.textContent = text;
        resultEl.className   = `mines-result${type ? " " + type : ""}`;
    }

    // Счетчик открытых клеток
    let revealedCount = 0;

    async function startGame() {
        const bet = parseInt(betInput.value, 10);
        minesNum = parseInt(minesCount.value, 10);

        if (!bet || bet <= 0)              { setResult("Введи ставку!"); return; }
        if (bet > getBalance())            { setResult("Недостаточно LM!"); return; }
        if (minesNum < 1 || minesNum > 24) { setResult("Мин: от 1 до 24"); return; }

        startBtn.disabled = true;
        setResult("Начинаем...");

        // ✅ НОВОЕ: вызываем playMines функцию
        // targetReveals = 0 сначала (юзер откроет сколько хочет)
        const playMines = window.gamesFunctions?.playMines;
        if (!playMines) {
            setResult("Ошибка: функция не загружена", "lose");
            startBtn.disabled = false;
            return;
        }

        try {
            // Сначала начинаем игру с targetReveals = 0
            // (результат будет проверен потом, когда юзер откроет клетки)
            currentGameData = await playMines(bet, minesNum, 0);

            if (currentGameData.outcome === "no-auth" || currentGameData.outcome === "error" || currentGameData.outcome === "no-money") {
                setResult("Ошибка: " + (currentGameData.outcome === "no-money" ? "недостаточно LM" : "ошибка"), "lose");
                startBtn.disabled = false;
                return;
            }

            revealedCount = 0;
            gameActive = true;
            buildGrid();
            updateMultiplier(0);

            startBtn.classList.add("hidden");
            cashoutBtn.classList.remove("hidden");
            setResult("Открывай клетки!");

        } catch (err) {
            console.error("mines/start error:", err);
            setResult("Ошибка сервера 😢", "lose");
            startBtn.disabled = false;
        }
    }

    async function revealCell(idx) {
        if (!gameActive || !currentGameData) return;

        const cell = gridEl.querySelector(`[data-idx="${idx}"]`);
        if (!cell || cell.classList.contains("revealed") || cell.classList.contains("mine")) return;

        // Проверяем попадание на мину
        const hitMine = currentGameData.minePositions.includes(idx);

        cell.classList.add("revealed");

        if (hitMine) {
            // Попали на мину! Игра кончена
            cell.textContent = "💣";
            cell.classList.add("mine");
            gameActive = false;

            // Показываем все мины
            currentGameData.minePositions.forEach(pos => {
                const mineCell = gridEl.querySelector(`[data-idx="${pos}"]`);
                if (mineCell) {
                    mineCell.classList.add("mine");
                    mineCell.textContent = "💣";
                }
            });

            // Блокируем сетку
            gridEl.querySelectorAll(".mines-cell").forEach(c => c.disabled = true);

            setResult(`💣 Попали на мину! -${parseInt(betInput.value)} LM`, "lose");
            
            startBtn.classList.remove("hidden");
            cashoutBtn.classList.add("hidden");
        } else {
            // Безопасная клетка
            cell.textContent = "💎";
            revealedCount++;
            updateMultiplier(revealedCount);
        }
    }

    async function cashout() {
        if (!gameActive || !currentGameData) return;

        gameActive = false;
        gridEl.querySelectorAll(".mines-cell").forEach(c => c.disabled = true);

        const bet = parseInt(betInput.value, 10);
        const MULTIPLIERS = [
            0, 1.00, 1.09, 1.24, 1.42, 1.66,
            1.99, 2.42, 2.99, 3.75, 4.74,
            6.08, 7.90, 10.3, 13.8, 18.5,
            25.2, 34.7, 48.4, 69.3, 102,
            153, 239, 399, 713, 1426,
        ];
        const multiplier = MULTIPLIERS[revealedCount] || 1;
        const payout = Math.floor(bet * multiplier);

        setResult(`🎉 Вывели ${payout} LM! (×${multiplier.toFixed(2)})`, "win");

        startBtn.classList.remove("hidden");
        cashoutBtn.classList.add("hidden");
    }

    startBtn.addEventListener("click", startGame);
    cashoutBtn.addEventListener("click", cashout);
    closeBtn.addEventListener("click", () => overlay.classList.add("hidden"));

    return {
        open: () => {
            overlay.classList.remove("hidden");
            resultEl.textContent = "";
            resultEl.className   = "mines-result";
            gridEl.innerHTML = "";
            revealedCount = 0;
            gameActive = false;
            currentGameData = null;
            startBtn.classList.remove("hidden");
            cashoutBtn.classList.add("hidden");
            updateMultiplier(0);
        },
    };
}
