import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

// Replace with your Firebase config
export const firebaseConfig = {
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
// experimentalAutoDetectLongPolling: เครือข่ายมือถือ/Safari (iOS) บางแห่งบล็อกการเชื่อมต่อแบบ streaming (WebChannel) ทำให้ Firestore
// ไม่ส่งข้อมูลมาเลยทั้งที่ไม่มี error (แอปคนขับเห็น "ไม่มีงาน") — ให้ SDK ตรวจเจอแล้วสลับไปใช้ long polling เองอัตโนมัติ
// localCache: เก็บข้อมูล Firestore ไว้ใน IndexedDB ของเครื่อง — เปิดเว็บครั้งถัดไปแสดงข้อมูลจากเครื่องทันที แล้วดึงเฉพาะส่วนที่เปลี่ยน
// จาก server (ไม่ต้องโหลดทั้ง collection ใหม่ทุกครั้ง) ใช้ได้หลายแท็บพร้อมกัน — เบราว์เซอร์ที่ใช้ IndexedDB ไม่ได้ SDK ใช้แคชในหน่วยความจำแทน
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
export const storage = getStorage(app)

/** ใช้ตรวจว่าตอนนี้ควรต่อ Emulator หรือไม่ — ที่อื่น (เช่น secondary app สำหรับสร้างบัญชีพนักงานใน stores/auth.ts)
 *  ที่ต้องสร้าง Firebase App/Auth instance เพิ่มเอง ต้องเช็คค่านี้เพื่อต่อ Emulator ให้ตรงกับ instance หลักด้วย
 *  ไม่งั้นตอน dev จะเผลอไปสร้างบัญชีจริงบน Firebase Auth ของจริงแทนที่จะเป็น Emulator */
export const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true'

// Local dev connects to the Firebase Emulator Suite (see .env.development).
// Production builds (.env.production) leave this false and hit real Firebase.
// Guarded with a global flag so Vite HMR re-running this module doesn't try
// to connect twice, which throws.
const g = globalThis as unknown as { __firebaseEmulatorsConnected?: boolean }
if (useEmulator && !g.__firebaseEmulatorsConnected) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  g.__firebaseEmulatorsConnected = true
  console.info('[firebase] connected to local emulators')
}

export default app
