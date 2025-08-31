// FIX: Lógica de inicialização resiliente que não quebra se a configuração estiver ausente.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

// Adiciona a propriedade __FIREBASE_CONFIG__ à interface Window
declare global {
  interface Window {
    __FIREBASE_CONFIG__?: Record<string, string>;
  }
}

const viteEnv = (import.meta as any).env;

const firebaseConfig = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || window.__FIREBASE_CONFIG__?.apiKey,
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || window.__FIREBASE_CONFIG__?.authDomain,
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || window.__FIREBASE_CONFIG__?.projectId,
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || window.__FIREBASE_CONFIG__?.storageBucket,
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || window.__FIREBASE_CONFIG__?.messagingSenderId,
  appId: viteEnv.VITE_FIREBASE_APP_ID || window.__FIREBASE_CONFIG__?.appId,
  measurementId: viteEnv.VITE_FIREBASE_MEASUREMENT_ID || window.__FIREBASE_CONFIG__?.measurementId,
};

// Valida se a configuração essencial está presente
const isConfigMissing = !firebaseConfig.apiKey || !firebaseConfig.projectId;

let app: firebase.app.App;
let db: firebase.firestore.Firestore;
let auth: firebase.auth.Auth;

// FIX: Exporta uma flag para a UI reagir à ausência de configuração.
export const FIREBASE_CONFIG_MISSING = isConfigMissing;

if (!isConfigMissing) {
  app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
  db = app.firestore();
  auth = app.auth();

  // Conexão com emuladores (apenas em desenvolvimento)
  /*
  if (import.meta.env.DEV) {
    try {
        console.log("Conectando aos emuladores do Firebase...");
        db.useEmulator('localhost', 8080);
        auth.useEmulator('http://localhost:9099');
        console.log("Conectado com sucesso aos emuladores.");
    } catch (error) {
        console.error("Erro ao conectar aos emuladores:", error);
    }
  }
  */
} else {
  console.error(
    "Configuração do Firebase ausente! A aplicação não funcionará corretamente. " +
    "Certifique-se de que suas variáveis de ambiente VITE_FIREBASE_* estão definidas " +
    "ou que window.__FIREBASE_CONFIG__ está presente no seu index.html."
  );
  // Exporta instâncias nulas para evitar que a importação quebre o app
  // @ts-ignore
  app = null;
  // @ts-ignore
  db = null;
  // @ts-ignore
  auth = null;
}

export { app, db, auth };
