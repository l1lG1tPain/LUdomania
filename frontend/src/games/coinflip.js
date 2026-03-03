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

    let selectedSide = null;
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
        if (!selectedSide) { resultEl.textContent = "Выбери орёл или решка!"; return; }

        const bet = parseInt(betInput.value, 10);
        if (!bet || bet <= 0)    { resultEl.textContent = "Введи ставку!"; return; }
        if (bet > getBalance())  { resultEl.textContent = "Недостаточно LM!"; return; }

        isFlipping = true;
        btnHeads.disabled = btnTails.disabled = true;
        resultEl.textContent = "";
        resultEl.className   = "coinflip-result";

        // Запускаем анимацию
        coinEl.className = "coinflip-coin spin";

        // ── Fetch отдельно от анимации ──
        let data = null;
        let fetchError = false;

        try {
            const resp = await fetch(`${API_BASE}/game/coinflip`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await getToken()}`,
                },
                body: JSON.stringify({ bet, side: selectedSide }),
            });
            data = await resp.json();
            if (!resp.ok) fetchError = true;
        } catch (err) {
            console.error("coinflip fetch error:", err);
            fetchError = true;
        }

        // Ждём конца анимации (1.2s)
        await new Promise(r => setTimeout(r, 1200));
        coinEl.classList.remove("spin");

        try {
            if (fetchError || !data) {
                resultEl.textContent = "Ошибка сервера 😢";
                resultEl.className   = "coinflip-result lose";
            } else {
                coinEl.classList.add(data.result ?? "");

                if (data.outcome === "win") {
                    resultEl.textContent = `🎉 +${data.payout} LM!`;
                    resultEl.className   = "coinflip-result win";
                } else {
                    resultEl.textContent = `💸 -${bet} LM`;
                    resultEl.className   = "coinflip-result lose";
                }

                if (data.newBalance != null) onBalanceChange(data.newBalance);
            }
        } finally {
            isFlipping = false;
            btnHeads.disabled = btnTails.disabled = false;
        }
    }

    document.getElementById("coinflipFlipBtn").addEventListener("click", flip);
    closeBtn.addEventListener("click", () => overlay.classList.add("hidden"));

    return {
        open: () => {
            overlay.classList.remove("hidden");
            resultEl.textContent = "";
            resultEl.className   = "coinflip-result";
            coinEl.className     = "coinflip-coin";
            selectedSide         = null;
            btnHeads.classList.remove("selected");
            btnTails.classList.remove("selected");
        },
    };
}