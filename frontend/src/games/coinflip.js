// src/games/coinflip.js
const API_BASE = window.__API_BASE__ || "https://161-97-99-137.sslip.io";

export function initCoinflip({ getBalance, getToken, onBalanceChange }) {
    const overlay  = document.getElementById("coinflipOverlay");
    const closeBtn = document.getElementById("coinflipClose");
    const betInput = document.getElementById("coinflipBet");
    const btnHeads = document.getElementById("coinflipHeads");
    const btnTails = document.getElementById("coinflipTails");
    const resultEl = document.getElementById("coinflipResult");
    const coinEl   = document.getElementById("coinflipCoin");

    if (!overlay) return;

    let selectedSide = null; // "heads" | "tails"
    let isFlipping   = false;

    btnHeads.addEventListener("click", () => {
        selectedSide = "heads";
        btnHeads.classList.add("selected");
        btnTails.classList.remove("selected");
    });

    btnTails.addEventListener("click", () => {
        selectedSide = "tails";
        btnTails.classList.add("selected");
        btnHeads.classList.remove("selected");
    });

    async function flip() {
        if (isFlipping) return;
        if (!selectedSide) {
            resultEl.textContent = "Выбери орёл или решка!";
            return;
        }

        const bet = parseInt(betInput.value, 10);
        if (!bet || bet <= 0) {
            resultEl.textContent = "Введи ставку!";
            return;
        }
        if (bet > getBalance()) {
            resultEl.textContent = "Недостаточно LM!";
            return;
        }

        isFlipping = true;
        btnHeads.disabled = btnTails.disabled = true;
        resultEl.textContent = "";

        // Анимация монетки
        coinEl.classList.remove("heads", "tails", "spin");
        void coinEl.offsetWidth;
        coinEl.classList.add("spin");

        try {
            const resp = await fetch(`${API_BASE}/game/coinflip`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await getToken()}`,
                },
                body: JSON.stringify({ bet, side: selectedSide }),
            });

            const data = await resp.json();

            // Ждём конца анимации (1.2s)
            await new Promise(r => setTimeout(r, 1200));
            coinEl.classList.remove("spin");
            coinEl.classList.add(data.result); // "heads" или "tails"

            if (data.outcome === "win") {
                resultEl.textContent = `🎉 +${data.payout} LM!`;
                resultEl.className   = "coinflip-result win";
            } else {
                resultEl.textContent = `💸 -${bet} LM`;
                resultEl.className   = "coinflip-result lose";
            }

            onBalanceChange(data.newBalance);
        } catch (err) {
            resultEl.textContent = "Ошибка сервера";
            console.error(err);
        } finally {
            isFlipping = false;
            btnHeads.disabled = btnTails.disabled = false;
        }
    }

    document.getElementById("coinflipFlipBtn").addEventListener("click", flip);

    closeBtn.addEventListener("click", () => {
        overlay.classList.add("hidden");
    });

    // Публичный метод открытия
    return {
        open: () => {
            overlay.classList.remove("hidden");
            resultEl.textContent = "";
            coinEl.className     = "coinflip-coin";
            selectedSide         = null;
            btnHeads.classList.remove("selected");
            btnTails.classList.remove("selected");
        },
    };
}