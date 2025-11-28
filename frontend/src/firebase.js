// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBlnYU50VMEbO6NyxPbyvoG0H5CciCxLI4",
    authDomain: "ludomania-1a0d2.firebaseapp.com",
    projectId: "ludomania-1a0d2",
    storageBucket: "ludomania-1a0d2.firebasestorage.app",
    messagingSenderId: "148402974884",
    appId: "1:148402974884:web:b19738b1aa7e0074fbf631",
    measurementId: "G-DLVBGCVZLH"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
// analytics пока не нужен — можно добавить потом
