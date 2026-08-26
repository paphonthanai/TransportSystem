import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initPwa } from './composables/usePwa'
import './styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// Phase F — ลงทะเบียน Service Worker + install prompt capture + update detection (ดู public/sw.js,
// composables/usePwa.ts) ไม่กระทบฝั่งแอดมิน/เดสก์ท็อปเลย เพราะ sw.js ไม่ intercept อะไรนอกจาก static asset
// ของ origin เดียวกัน (ดู CACHEABLE_EXTENSIONS ใน sw.js)
initPwa()
