// End-to-end smoke test: real Electron app + mock Korail server.
// Run after `npm run build`; on Linux without a display use `xvfb-run -a npm run e2e`.
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron } from 'playwright'
import { MOCK_USER, startMockKorail } from './mock-korail.mjs'

const shots = join(process.cwd(), 'e2e', 'screenshots')
mkdirSync(shots, { recursive: true })

function assert(cond, message) {
  if (!cond) throw new Error(`E2E assertion failed: ${message}`)
}

const mock = await startMockKorail({ soldOutRounds: 2 })
const userData = mkdtempSync(join(tmpdir(), 'korail-e2e-'))
console.log(`mock korail at ${mock.base}, userData ${userData}`)

const extraArgs = process.env.E2E_ELECTRON_ARGS ? process.env.E2E_ELECTRON_ARGS.split(' ') : []
const app = await electron.launch({
  args: ['out/main/index.js', ...extraArgs],
  env: { ...process.env, KORAIL_API_BASE: mock.base, KORAIL_USER_DATA: userData, KORAIL_DEBUG: '1' },
})
app.process().stdout?.on('data', (d) => process.stdout.write(`[electron] ${d}`))
app.process().stderr?.on('data', (d) => process.stderr.write(`[electron:err] ${d}`))

try {
  const page = await app.firstWindow()
  page.on('dialog', (d) => d.accept())
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[renderer:error] ${m.text()}`)
  })
  await page.waitForSelector('.login-card', { timeout: 20000 })
  await page.screenshot({ path: join(shots, '01-login.png') })

  // Wrong password first.
  await page.fill('input[autocomplete="username"]', MOCK_USER.id)
  await page.fill('input[type="password"]', 'wrong')
  await page.click('button[type="submit"]')
  await page.waitForSelector('.alert.error', { timeout: 10000 })
  const err = await page.textContent('.alert.error')
  assert(err.includes('올바르지'), `login error shown: ${err}`)

  await page.fill('input[type="password"]', MOCK_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForSelector('.session strong', { timeout: 10000 })
  assert((await page.textContent('.session strong')) === MOCK_USER.name, 'session name rendered')

  // Search.
  const tomorrow = new Date(Date.now() + 86400000)
  const iso = tomorrow.toISOString().slice(0, 10)
  await page.fill('input[list="station-list"] >> nth=0', '서울')
  await page.fill('input[list="station-list"] >> nth=1', '부산')
  await page.fill('input[type="date"]', iso)
  await page.fill('input[type="time"] >> nth=0', '08:00')
  await page.fill('input[type="time"] >> nth=1', '12:00')
  await page.click('text=열차 조회')
  await page.waitForSelector('table.trains tbody tr', { timeout: 10000 })
  const rows = await page.$$('table.trains tbody tr')
  assert(rows.length === 5, `5 trains in 08:00-12:00 window, got ${rows.length}`)
  await page.screenshot({ path: join(shots, '02-search.png') })

  // Only KTX is checked by default: ITX/무궁화 rows should be dimmed.
  const excluded = await page.$$('table.trains tbody tr.excluded')
  assert(excluded.length === 2, `2 excluded rows, got ${excluded.length}`)

  // Target the 09:00 KTX (sold out now, opens after 2 rounds) with a 1s interval.
  await page.check('input[aria-label="KTX 003 선택"]')
  await page.fill('input[type="number"] >> nth=4', '1') // 재조회 간격
  await page.fill('input[type="number"] >> nth=5', '0') // 지터
  await page.click('text=자동 예매 시작')
  await page.waitForSelector('.pill.running', { timeout: 10000 })
  await page.screenshot({ path: join(shots, '03-running.png') })

  await page.waitForSelector('.reservation-card.highlight', { timeout: 30000 })
  await page.screenshot({ path: join(shots, '04-success.png') })
  const box = await page.textContent('.success-box')
  assert(box.includes('KTX 003편'), `success box mentions train 003: ${box}`)
  assert(box.includes('예약번호'), 'success box has PNR')
  assert(mock.state.reservations.length === 1, 'one reservation on the server')
  assert(mock.state.reservations[0].h_trn_no === '003', 'reserved train 003')
  assert(mock.state.scheduleCalls >= 3, `polled at least 3 times (got ${mock.state.scheduleCalls})`)
  assert(mock.state.dynapathSeen.some((p) => p.endsWith('login.Login')), 'DynaPath token sent on login')
  assert(mock.state.dynapathSeen.some((p) => p.endsWith('ScheduleView')), 'DynaPath token sent on search')
  assert(mock.state.dynapathSeen.some((p) => p.endsWith('TicketReservation')), 'DynaPath token sent on reserve')
  assert(mock.state.sidSeen.includes('search'), 'Sid sent on search')
  const logText = await page.textContent('[data-testid="log"]')
  assert(logText.includes('예약 성공'), 'log shows success')

  // Cancel it from the UI.
  await page.click('.reservations button:has-text("예약 취소")')
  await page.waitForFunction(() => document.querySelectorAll('.reservations li').length === 0, null, { timeout: 10000 })
  assert(mock.state.reservations.length === 0, 'reservation cancelled on the server')
  await page.screenshot({ path: join(shots, '05-cancelled.png') })

  // Logout returns to the login card.
  await page.click('text=로그아웃')
  await page.waitForSelector('.login-card', { timeout: 10000 })
  console.log('E2E OK — requests:', mock.state.log.length, 'schedule calls:', mock.state.scheduleCalls)
} finally {
  await app.close()
  await mock.close()
}
