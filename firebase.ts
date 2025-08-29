// FIX: The original import for `initializeApp` was causing an error. This can happen
// with project setups that have conflicting Firebase versions. Switched to `firebase/compat/app`
// which provides a compatible `initializeApp` function. The rest of the app can
// continue to use the v9 modular SDK with the app instance created here.
import firebase from "firebase/compat/app";
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

// Initialize Firebase, preventing re-initialization
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

// Export db and auth instances
export const db = getFirestore(app);
export const auth = getAuth(app);
