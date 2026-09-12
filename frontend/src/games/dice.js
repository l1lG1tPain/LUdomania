// src/games/dice.js — ОБНОВЛЕННАЯ ВЕРСИЯ
// Теперь использует Firestore вместо Express API

export function initDice({ getBalance, getToken, onBalanceChange }) {
    const overlay     = document.getElementById("diceOverlay");
    const closeBtn    = document.getElementById("diceClose");
    const betInput    = document.getElementById("diceBet");
    const rollBtnName = "diceRollBtn";
    const resultEl    = document.getElementById("diceResult");
    const diceEl      = document.getElementById("diceFace");

    if (!overlay) return;

    let selectedNumber = null;
    let isRolling      = false;

    // Создаем кнопки выбора чисел (1-6)
    for (let i = 1; i <= 6; i++) {
        const btn = document.getElementById(`diceNumber${i}`);
        if (btn) {
            btn.addEventListener("click", () => {
                selectedNumber = i;
                // Добавляем визуальное выделение
                for (let j = 1; j <= 6; j++) {
                    const b = document.getElementById(`diceNumber${j}`);
                    if (b) b.classList.toggle("selected", j === i);
                }
            });
        }
    }

    async function roll() {
        if (isRolling) return;
        if (!selectedNumber) { resultEl.textContent = "Выбери число 1-6!"; return; }

        const bet = parseInt(betInput.value, 10);
        if (!bet || bet <= 0)   { resultEl.textContent = "Введи ставку!"; return; }
        if (bet > getBalance()) { resultEl.textContent = "Недостаточно LM!"; return; }

        isRolling = true;
        document.getElementById(rollBtnName).disabled = true;
        resultEl.textContent = "";
        resultEl.className   = "dice-result";
        
        // Анимация кубика
        if (diceEl) {
            diceEl.classList.add("rolling");
        }

        let data = null;
        let fetchError = false;

        try {
            // ✅ НОВОЕ: вызываем функцию из main-1.js вместо fetch
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
        if (diceEl) diceEl.classList.remove("rolling");

        try {
            if (fetchError || !data) {
                resultEl.textContent = "Ошибка 😢";
                resultEl.className   = "dice-result lose";
            } else {
                // Показываем выпавшее число
                if (diceEl) {
                    diceEl.textContent = data.roll;
                    diceEl.classList.add(data.outcome === "win" ? "win" : "lose");
                }

                if (data.outcome === "win") {
                    resultEl.textContent = `🎉 +${data.payout} LM! (×5)`;
                    resultEl.className   = "dice-result win";
                } else {
                    resultEl.textContent = `💸 -${bet} LM`;
                    resultEl.className   = "dice-result lose";
                }
                if (data.newBalance != null) onBalanceChange(data.newBalance);
            }
        } finally {
            isRolling = false;
            document.getElementById(rollBtnName).disabled = false;
        }
    }

    document.getElementById(rollBtnName).addEventListener("click", roll);
    closeBtn.addEventListener("click", () => overlay.classList.add("hidden"));

    return {
        open: () => {
            overlay.classList.remove("hidden");
            resultEl.textContent = "";
            resultEl.className   = "dice-result";
            if (diceEl) {
                diceEl.textContent = "?";
                diceEl.classList.remove("win", "lose", "rolling");
            }
            selectedNumber = null;
            // Убираем выделение со всех кнопок
            for (let i = 1; i <= 6; i++) {
                const btn = document.getElementById(`diceNumber${i}`);
                if (btn) btn.classList.remove("selected");
            }
        },
    };
}
