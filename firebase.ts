// FIX: Use a named import for `initializeApp` as per Firebase v9+ modular SDK conventions.
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApZq6UnHHNaYwY5I5_WldrkQxF2zdq6oU",
  authDomain: "sistema-oficinadoaluno.firebaseapp.com",
  projectId: "sistema-oficinadoaluno",
  storageBucket: "sistema-oficinadoaluno.firebasestorage.app",
  messagingSenderId: "203303746274",
  appId: "1:203303746274:web:e394f5a30e637c35314818"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export db and auth instances
export const db = getFirestore(app);
export const auth = getAuth(app);