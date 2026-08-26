import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

/**
 * Phase F — ตรวจ production build output จริง (ไม่ mock) ต้องรัน `npm run build` มาก่อนเทสต์ชุดนี้เสมอ (เหมือนที่
 * ระบุไว้ใน Step 14 ของสเปก — build ก่อน แล้วค่อย verify) ตรวจจาก dist/ ตรงๆ ไม่ใช่ public/ เพราะเป้าหมายคือยืนยันว่า
 * ไฟล์เหล่านี้ถูก serve จริงตอน deploy ไม่ใช่แค่มีอยู่ใน source
 */
const distDir = path.resolve(__dirname, '../dist')

describe('Test 1 — Manifest (production build)', () => {
  it('dist/manifest.json exists with every required field', () => {
    const manifestPath = path.join(distDir, 'manifest.json')
    expect(existsSync(manifestPath)).toBe(true)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBeTruthy()
    expect(manifest.scope).toBeTruthy()
    expect(manifest.display).toBe('standalone')
    expect(Array.isArray(manifest.icons)).toBe(true)
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
  })

  it('start_url matches a route that actually exists in the router (/driver-app)', () => {
    const manifest = JSON.parse(readFileSync(path.join(distDir, 'manifest.json'), 'utf-8'))
    expect(manifest.start_url).toBe('/driver-app')
  })

  it('has both the 192x192 and 512x512 icon sizes required for installability', () => {
    const manifest = JSON.parse(readFileSync(path.join(distDir, 'manifest.json'), 'utf-8'))
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })
})

describe('Test 2 — Service Worker (production build)', () => {
  it('dist/sw.js exists and registers install/activate/fetch handlers', () => {
    const swPath = path.join(distDir, 'sw.js')
    expect(existsSync(swPath)).toBe(true)
    const sw = readFileSync(swPath, 'utf-8')
    expect(sw).toContain("addEventListener('install'")
    expect(sw).toContain("addEventListener('activate'")
    expect(sw).toContain("addEventListener('fetch'")
  })

  it('does not call skipWaiting() unconditionally on install (must wait for explicit driver confirmation)', () => {
    const sw = readFileSync(path.join(distDir, 'sw.js'), 'utf-8')
    const installBlockMatch = sw.match(/addEventListener\('install',[\s\S]*?\n\}\)/)
    expect(installBlockMatch).not.toBeNull()
    // เช็คการ "เรียกใช้จริง" (มีวงเล็บ) ไม่ใช่แค่คำว่า skipWaiting เฉยๆ — comment ในบล็อกนี้อธิบายว่า "ไม่เรียก
    // skipWaiting()" ไว้ตรงๆ อยู่แล้ว (ตั้งใจ) ถ้าเช็คแค่คำเปล่าๆ จะ false-positive ชนกับ comment ของตัวเอง
    expect(installBlockMatch![0]).not.toContain('self.skipWaiting()')
  })

  it('skipWaiting() is only ever invoked from the SKIP_WAITING message handler, not from install', () => {
    const sw = readFileSync(path.join(distDir, 'sw.js'), 'utf-8')
    const callSites = [...sw.matchAll(/self\.skipWaiting\(\)/g)]
    expect(callSites).toHaveLength(1)
    const messageBlockMatch = sw.match(/addEventListener\('message',[\s\S]*?\n\}\)/)
    expect(messageBlockMatch).not.toBeNull()
    expect(messageBlockMatch![0]).toContain('self.skipWaiting()')
  })

  it('only intercepts static-asset-looking same-origin GET requests — structurally excludes Firestore/Auth/API calls', () => {
    const sw = readFileSync(path.join(distDir, 'sw.js'), 'utf-8')
    // ทั้งสองเงื่อนไขนี้ใน fetch handler คือสิ่งที่ทำให้ทุก request ไป Firebase (cross-origin เสมอ) ไม่มีทางถูก
    // cache ได้เลยโดยโครงสร้าง — ไม่ต้องพึ่งการเช็คชื่อ hostname ตรงๆ (เปราะกว่า เพราะ comment อธิบายในไฟล์นี้เองก็มีคำว่า
    // "Firestore" ปนอยู่ ถ้าเช็คแค่คำจะ false-positive ชนกับ comment)
    expect(sw).toMatch(/req\.method !== 'GET'/)
    expect(sw).toMatch(/url\.origin !== self\.location\.origin/)
  })

  it('icons referenced by the manifest actually exist in the build output', () => {
    const manifest = JSON.parse(readFileSync(path.join(distDir, 'manifest.json'), 'utf-8'))
    for (const icon of manifest.icons as Array<{ src: string }>) {
      const iconPath = path.join(distDir, icon.src.replace(/^\//, ''))
      expect(existsSync(iconPath)).toBe(true)
    }
  })
})

describe('Test 3 — Driver route wiring', () => {
  it('index.html links the manifest and required PWA meta tags', () => {
    const html = readFileSync(path.join(distDir, 'index.html'), 'utf-8')
    expect(html).toContain('rel="manifest"')
    expect(html).toMatch(/name="theme-color"/)
    expect(html).toMatch(/name="mobile-web-app-capable"/)
    expect(html).toMatch(/name="apple-mobile-web-app-capable"/)
    expect(html).toMatch(/name="apple-mobile-web-app-status-bar-style"/)
  })
})
