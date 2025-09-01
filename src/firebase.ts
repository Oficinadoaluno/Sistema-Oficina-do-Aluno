import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

declare global {
  interface Window {
    __FIREBASE_CONFIG__?: Record<string, string>;
  }
}

const viteEnv = (import.meta as any)?.env ?? {};

const firebaseConfig = {
  apiKey: "AIzaSyApZq6UnHHNaYwY5I5_WldrkQxF2zdq6oU",
  authDomain: "sistema-oficinadoaluno.firebaseapp.com",
  projectId: "sistema-oficinadoaluno",
  storageBucket: "sistema-oficinadoaluno.firebasestorage.app",
  messagingSenderId: "296393709615",
  appId: "1:296393709615:web:1c37f1867522b51f3b8eda",
  measurementId: "G-V66GW4L7ZV"
};

const isConfigMissing = !firebaseConfig.apiKey || !firebaseConfig.projectId;

let app: firebase.app.App;
let db: firebase.firestore.Firestore;
let auth: firebase.auth.Auth;

export const FIREBASE_CONFIG_MISSING = isConfigMissing;

if (!isConfigMissing) {
  app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
  db = app.firestore();
  auth = app.auth();
} else {
  console.error(
    "Configuração do Firebase ausente! A aplicação não funcionará corretamente. " +
    "Certifique-se de que suas variáveis de ambiente VITE_FIREBASE_* estão definidas " +
    "ou que window.__FIREBASE_CONFIG__ está presente no seu index.html."
  );
  // @ts-ignore
  app = null;
  // @ts-ignore
  db = null;
  // @ts-ignore
  auth = null;
}

export { app, db, auth };