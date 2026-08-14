import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// ลงทะเบียน Service Worker ขั้นต่ำ (ดู public/sw.js) — มีไว้แค่ให้ Driver App ติดตั้งเป็น PWA ได้ (Add to Home Screen)
// ยังไม่ทำ caching/offline ใดๆ — ไม่กระทบฝั่งแอดมิน/เดสก์ท็อปเลย เพราะไม่ intercept request อะไรทั้งสิ้น
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // ติดตั้ง PWA ไม่ได้ก็ไม่กระทบการใช้งานหลัก ปล่อยผ่านเงียบๆ
    })
  })
}
