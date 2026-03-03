// src/games/dice.js
const API_BASE = window.__API_BASE__ || "https://161-97-99-137.sslip.io";

// Множители: угадал точно → x6, ±1 → x2, ±2 → x1.5, иначе проигрыш
const PAYOUT_TABLE = { 0: 6, 1: 2, 2: 1.5 };

export function initDice({ getBalance, getToken, onBalanceChange }) {
    const overlay  = document.getElementById("diceOverlay");
    const closeBtn = document.getElementById("diceClose");
    const betInput = document.getElementById("diceBet");
    const guessEl  = document.getElementById("diceGuess");
    const minusBtn = document.getElementById("diceGuessMinus");
    const plusBtn  = document.getElementById("diceGuessPlus");
    const rollBtn  = document.getElementById("diceRollBtn");
    const resultEl = document.getElementById("diceResult");
    const diceEl   = document.getElementById("diceDisplay");

    if (!overlay) return;

    let guess    = 3;
    let isRolling = false;

    const DICE_FACES = ["⚀","⚁","⚂","⚃","⚄","⚅"];

    function updateGuess() {
        if (guessEl) guessEl.textContent = guess;
    }

    minusBtn?.addEventListener("click", () => { if (guess > 1) { guess--; updateGuess(); } });
    plusBtn?.addEventListener("click",  () => { if (guess < 6) { guess++; updateGuess(); } });

    async function roll() {
        if (isRolling) return;

        const bet = parseInt(betInput.value, 10);
        if (!bet || bet <= 0) { resultEl.textContent = "Введи ставку!"; return; }
        if (bet > getBalance()) { resultEl.textContent = "Недостаточно LM!"; return; }

        isRolling      = true;
        rollBtn.disabled = true;

        // Анимация кубика
        diceEl.classList.add("rolling");
        let animInterval = setInterval(() => {
            diceEl.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
        }, 80);

        try {
            const resp = await fetch(`${API_BASE}/game/dice`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await getToken()}`,
                },
                body: JSON.stringify({ bet, guess }),
            });

            const data = await resp.json();

            await new Promise(r => setTimeout(r, 900));
            clearInterval(animInterval);
            diceEl.classList.remove("rolling");
            diceEl.textContent = DICE_FACES[data.rolled - 1];

            if (data.outcome === "win") {
                resultEl.textContent = `🎲 Выпало ${data.rolled}! +${data.payout} LM (x${data.multiplier})`;
                resultEl.className   = "dice-result win";
            } else {
                resultEl.textContent = `🎲 Выпало ${data.rolled}. -${bet} LM`;
                resultEl.className   = "dice-result lose";
            }

            onBalanceChange(data.newBalance);
        } catch (err) {
            clearInterval(animInterval);
            resultEl.textContent = "Ошибка сервера";
            console.error(err);
        } finally {
            isRolling        = false;
            rollBtn.disabled = false;
        }
    }

    rollBtn?.addEventListener("click", roll);
    closeBtn?.addEventListener("click", () => overlay.classList.add("hidden"));

    updateGuess();

    return {
        open: () => {
            overlay.classList.remove("hidden");
            resultEl.textContent  = "";
            diceEl.textContent    = "🎲";
            diceEl.className      = "dice-display";
        },
    };
}