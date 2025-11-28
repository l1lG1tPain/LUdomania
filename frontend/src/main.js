import { auth } from "./firebase.js";
import { signInWithCustomToken } from "firebase/auth";

const loginBtn = document.getElementById("login");

loginBtn.addEventListener("click", async () => {
    if (!window.Telegram || !window.Telegram.WebApp) {
        alert("Открой игру как Telegram MiniApp, тогда авторизация сработает 🙂");
        return;
    }

    try {
        const initData = window.Telegram.WebApp.initData;

        const resp = await fetch("https://ludomania.onrender.com/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData })
        });

        if (!resp.ok) {
            console.error("Auth error:", await resp.text());
            alert("Ошибка авторизации");
            return;
        }

        const { token } = await resp.json();
        await signInWithCustomToken(auth, token);

        alert("Успешная авторизация через Telegram + Firebase!");
    } catch (err) {
        console.error(err);
        alert("Что-то пошло не так");
    }
});
