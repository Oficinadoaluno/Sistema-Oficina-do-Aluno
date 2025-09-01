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
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || window.__FIREBASE_CONFIG__?.apiKey,
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || window.__FIREBASE_CONFIG__?.authDomain,
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || window.__FIREBASE_CONFIG__?.projectId,
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || window.__FIREBASE_CONFIG__?.storageBucket,
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || window.__FIREBASE_CONFIG__?.messagingSenderId,
  appId: viteEnv.VITE_FIREBASE_APP_ID || window.__FIREBASE_CONFIG__?.appId,
  measurementId: viteEnv.VITE_FIREBASE_MEASUREMENT_ID || window.__FIREBASE_CONFIG__?.measurementId,
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