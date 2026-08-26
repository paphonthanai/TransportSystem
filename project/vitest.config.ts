import { defineConfig } from 'vitest/config'
import path from 'path'

const dirname = import.meta.dirname

/**
 * แยกจาก vite.config.ts เพราะ Vitest ไม่ต้องการ plugin('vue')/build options ของแอปจริง (ไม่ได้ mount component
 * ในเทสต์ชุดนี้ — เทสต์ store/utility function ล้วน) แต่ยังต้อง resolve alias @/* เดียวกับแอปจริงเป๊ะ ไม่งั้น import
 * path ในโค้ดที่ถูกทดสอบจะหาไฟล์ไม่เจอ
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: false,
  },
})
