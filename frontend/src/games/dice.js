// src/games/dice.js — ИСПРАВЛЕННАЯ ВЕРСИЯ
// Теперь использует правильные элементы из HTML (diceGuess, ±)

export function initDice({ getBalance, getToken, onBalanceChange }) {
    const overlay      = document.getElementById("diceOverlay");
    const closeBtn     = document.getElementById("diceClose");
    const betInput     = document.getElementById("diceBet");
    const guessDisplay = document.getElementById("diceGuess");
    const minusBtn     = document.getElementById("diceGuessMinus");
    const plusBtn      = document.getElementById("diceGuessPlus");
    const rollBtnName  = "diceRollBtn";
    const resultEl     = document.getElementById("diceResult");
    const diceEl       = document.getElementById("diceFace");

    if (!overlay) return;

    let selectedNumber = 3; // По умолчанию

    // Кнопки +/-
    minusBtn.addEventListener("click", () => {
        selectedNumber = Math.max(1, selectedNumber - 1);
        guessDisplay.textContent = selectedNumber;
    });

    plusBtn.addEventListener("click", () => {
        selectedNumber = Math.min(6, selectedNumber + 1);
        guessDisplay.textContent = selectedNumber;
    });

    async function roll() {
        const rollBtn = document.getElementById(rollBtnName);
        if (rollBtn.disabled) return;

        const bet = parseInt(betInput.value, 10);
        if (!bet || bet <= 0)   { resultEl.textContent = "Введи ставку!"; resultEl.className = "dice-result"; return; }
        if (bet > getBalance()) { resultEl.textContent = "Недостаточно LM!"; resultEl.className = "dice-result"; return; }

        rollBtn.disabled = true;
        resultEl.textContent = "Бросаю...";
        resultEl.className   = "dice-result";

        let data = null;
        let fetchError = false;

        try {
            // Вызываем функцию из main.js
            const playDice = window.gamesFunctions?.playDice;
            if (!playDice) {
                throw new Error("playDice function not available");
            }

            data = await playDice(bet, selectedNumber);

            if (data.outcome === "no-auth" || data.outcome === "error" || data.outcome === "no-money") {
                fetchError = true;
            }
        } catch (err) {
            console.error("dice error:", err);
            fetchError = true;
        }

        // Ждём конца анимации
        await new Promise(r => setTimeout(r, 1000));

        try {
            if (fetchError || !data) {
                resultEl.textContent = "Ошибка 😢";
                resultEl.className   = "dice-result lose";
            } else {
                if (data.outcome === "win") {
                    resultEl.textContent = `🎉 +${data.payout} LM! (Угадал!)`;
                    resultEl.className   = "dice-result win";
                } else {
                    resultEl.textContent = `💸 -${bet} LM (Выпало ${data.roll})`;
                    resultEl.className   = "dice-result lose";
                }
                if (data.newBalance != null) onBalanceChange(data.newBalance);
            }
        } finally {
            rollBtn.disabled = false;
        }
    }

    document.getElementById(rollBtnName).addEventListener("click", roll);
    closeBtn.addEventListener("click", () => {
        overlay.classList.add("hidden");
        // Сбросить состояние при закрытии
        resultEl.textContent = "";
        resultEl.className   = "dice-result";
        selectedNumber = 3;
        guessDisplay.textContent = selectedNumber;
    });

    return {
        open: () => {
            overlay.classList.remove("hidden");
            resultEl.textContent = "";
            resultEl.className   = "dice-result";
            selectedNumber = 3;
            guessDisplay.textContent = selectedNumber;
        },
    };
}
