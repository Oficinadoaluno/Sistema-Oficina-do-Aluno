// FIX: Switched to Firebase v8 compatibility layer to match the syntax used across the application.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

// Your web app's Firebase configuration.
// For more information on how to get this, visit:
// https://firebase.google.com/docs/web/setup#available-libraries

// IMPORTANT: Ensure your .env.local file has the correct VITE_FIREBASE_* variables.
const firebaseConfig = {
  // FIX: Cast import.meta to 'any' to resolve TypeScript errors regarding missing 'env' property.
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
};

// Tip: If you encounter storage/file upload errors, double-check that the
// `storageBucket` value in your environment variables is correct and that
// Firebase Storage is enabled in your Firebase Console.

// FIX: Initialize Firebase using the v8 compatibility API.
const app: firebase.app.App = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
const db: firebase.firestore.Firestore = app.firestore();
const auth: firebase.auth.Auth = app.auth();

// --- EMULATOR CONNECTION (for local development) ---
// To use the local Firebase emulators, uncomment the following lines.
// Make sure the emulators are running (`firebase emulators:start`).
// Vite's `import.meta.env.DEV` is used to only connect in development mode.
/*
if ((import.meta as any).env.DEV) {
  try {
    console.log("Connecting to Firebase emulators...");
    // FIX: Switched to v8 compatibility API for connecting to emulators.
    db.useEmulator('localhost', 8080);
    auth.useEmulator('http://localhost:9099');
    console.log("Successfully connected to Firebase emulators.");
  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}
*/

export { app, db, auth };
