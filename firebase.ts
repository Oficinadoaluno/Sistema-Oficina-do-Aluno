import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApZq6UnHHNaYwY5I5_WldrkQxF2zdq6oU",
  authDomain: "sistema-oficinadoaluno.firebaseapp.com",
  projectId: "sistema-oficinadoaluno",
  storageBucket: "sistema-oficinadoaluno.firebasestorage.app",
  messagingSenderId: "296393709615",
  appId: "1:296393709615:web:1c37f1867522b51f3b8eda",
  measurementId: "G-V66GW4L7ZV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
