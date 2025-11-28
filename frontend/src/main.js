import { auth } from "./firebase.js";
import { signInWithCustomToken } from "firebase/auth";

const loginBtn = document.getElementById("login");

loginBtn.addEventListener("click", async () => {
    if (!window.Telegram || !window.Telegram.WebApp) {
        alert("Открой через Telegram MiniApp");
        return;
    }

    try {
        const initData = window.Telegram.WebApp.initData;

        const resp = await fetch("http://localhost:3000/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData })
        });

        const { token } = await resp.json();
        await signInWithCustomToken(auth, token);

        alert("Успешная авторизация!");
    } catch (err) {
        console.error(err);
        alert("Ошибка");
    }
});
