// ui/prizeView.js
import { getPrizeVisual } from "../gameConfig.js";

export function createPrizeIcon(prizeId) {
    const visual = getPrizeVisual(prizeId);

    const wrapper = document.createElement("span");
    wrapper.className = "prize-icon";

    if (visual.isNft && visual.src) {
        const img = document.createElement("img");
        img.src = visual.src;
        img.alt = visual.alt;
        img.loading = "lazy";
        img.className = "prize-icon-img prize-icon-img-nft";
        wrapper.appendChild(img);
    } else {
        wrapper.textContent = visual.emoji;
        wrapper.classList.add("prize-icon-emoji");
    }

    return wrapper;
}
