import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApZq6UnHHNaYwY5I5_WldrkQxF2zdq6oU",
  authDomain: "sistema-oficinadoaluno.firebaseapp.com",
  projectId: "sistema-oficinadoaluno",
  storageBucket: "sistema-oficinadoaluno.firebasestorage.app",
  messagingSenderId: "203303746274",
  appId: "1:203303746274:web:e394f5a30e637c35314818"
};

// Initialize Firebase, preventing re-initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// --- EMULATOR CONNECTION (for local development) ---
// To use the local Firebase emulators, uncomment the following lines.
// Make sure the emulators are running using `firebase emulators:start`.
/*
if (window.location.hostname === "localhost") {
  try {
    console.log("Connecting to Firebase emulators...");
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log("Successfully connected to emulators.");
  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}
*/

export { app, db, auth };
