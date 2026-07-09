import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoKey123456789',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'thanthara-tms.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'thanthara-tms',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'thanthara-tms.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef123456',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Local dev connects to the Firebase Emulator Suite (see .env.development).
// Production builds (.env.production) leave this false and hit real Firebase.
// Guarded with a global flag so Vite HMR re-running this module doesn't try
// to connect twice, which throws.
const g = globalThis as unknown as { __firebaseEmulatorsConnected?: boolean }
if (import.meta.env.VITE_USE_EMULATOR === 'true' && !g.__firebaseEmulatorsConnected) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  g.__firebaseEmulatorsConnected = true
  console.info('[firebase] connected to local emulators')
}

export default app
