// Renders resources/icon.png (1024x1024) from an inline SVG using Playwright's Chromium.
// Usage: node scripts/make-icon.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b5fd6"/>
      <stop offset="1" stop-color="#1fa3ff"/>
    </linearGradient>
  </defs>
  <rect x="64" y="64" width="896" height="896" rx="200" fill="url(#g)"/>
  <path d="M232 340 h560 a40 40 0 0 1 40 40 v90 a60 60 0 0 0 0 120 v90 a40 40 0 0 1 -40 40 h-560 a40 40 0 0 1 -40 -40 v-90 a60 60 0 0 0 0 -120 v-90 a40 40 0 0 1 40 -40 z" fill="#ffffff" opacity="0.96"/>
  <line x1="640" y1="360" x2="640" y2="700" stroke="#0b5fd6" stroke-width="10" stroke-dasharray="22 18" opacity="0.6"/>
  <path d="M330 540 l90 90 l170 -190" fill="none" stroke="#12995b" stroke-width="54" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="712" cy="530" r="34" fill="#0b5fd6" opacity="0.9"/>
</svg>`

const html = `<html><body style="margin:0;background:transparent">${svg}</body></html>`
const out = join(process.cwd(), 'resources')
mkdirSync(out, { recursive: true })
const tmp = join(out, 'icon.html')
writeFileSync(tmp, html)
// PW_CHROMIUM lets environments with a pre-installed Chromium skip the Playwright download.
const browser = await chromium.launch({ args: ['--no-sandbox'], executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } })
await page.goto('file://' + tmp)
await page.screenshot({ path: join(out, 'icon.png'), omitBackground: true, clip: { x: 0, y: 0, width: 1024, height: 1024 } })
await browser.close()
import('node:fs').then((fs) => fs.unlinkSync(tmp))
console.log('wrote resources/icon.png')
