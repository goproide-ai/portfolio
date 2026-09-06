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
// E2E_ELECTRON_EXECUTABLE points at a packaged build (e.g. release/linux-unpacked/korail-auto-booking)
// to verify the installer contents; otherwise the dev Electron runs out/main/index.js.
const packaged = process.env.E2E_ELECTRON_EXECUTABLE
console.log(packaged ? `driving packaged app ${packaged}` : 'driving out/main/index.js with dev Electron')
const app = await electron.launch({
  ...(packaged ? { executablePath: packaged } : {}),
  args: [...(packaged ? [] : ['out/main/index.js']), ...extraArgs],
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

  // ---------------------------------------------------------------------------------------------
  // Waiting-list scenario (the case a real user hit): the only target is sold out with a waiting
  // list. The engine must join it once, report it as a 예약대기 with no deadline (never "0000-00-00
  // 기한 경과"), keep polling, and reserve the real seat that opens later.
  await page.fill('input[autocomplete="username"]', MOCK_USER.id)
  await page.fill('input[type="password"]', MOCK_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForSelector('.session strong', { timeout: 10000 })
  await page.click('text=열차 조회')
  await page.waitForSelector('table.trains tbody tr', { timeout: 10000 })
  await page.click('button:has-text("선택 해제")').catch(() => undefined)
  await page.check('input[aria-label="KTX-산천 005 선택"]')
  await page.check('label:has-text("좌석이 없으면 예약대기라도 신청") input')
  assert(await page.isChecked('label:has-text("예약대기 등록 후에도 빈 좌석 계속 찾기") input'), 'continue-after-waitlist is on by default')
  await page.fill('input[aria-label="좌석 배정 알림 휴대폰 번호"]', '010-1234-5678')
  await page.fill('input[type="number"] >> nth=4', '1')
  await page.fill('input[type="number"] >> nth=5', '0')
  // Train 005 gets a real seat two polls after the waiting list is joined.
  mock.state.train005OpensAfter = mock.state.scheduleCalls + 2
  await page.click('text=자동 예매 시작')
  await page.waitForSelector('.reservation-card.highlight.waiting', { timeout: 20000 })
  await page.screenshot({ path: join(shots, '06-waitlisted.png') })
  const waitTitle = await page.textContent('.reservation-card.highlight.waiting h2')
  assert(waitTitle.includes('예약대기 등록됨'), `waiting-list title: ${waitTitle}`)
  const waitBox = await page.textContent('.reservation-card.highlight.waiting .success-box')
  assert(waitBox.includes('예약대기번호'), 'waiting-list box shows the waiting number')
  assert(waitBox.includes('좌석 배정 대기 중'), 'waiting-list box explains there is no deadline yet')
  assert(!waitBox.includes('0000') && !waitBox.includes('기한 경과'), `no bogus deadline: ${waitBox}`)
  assert(waitBox.includes('코레일+') && !waitBox.includes('코레일톡'), 'wording refers to the 코레일+ app')
  assert((await page.$('.pill.waiting')) !== null, 'status bar shows the waiting-list pill')
  assert(mock.state.reservations.filter((r) => r.h_rsv_tp_cd === '8').length === 1, 'one waiting-list entry on the server')
  // The standby was completed with the app's second step, carrying the SMS opt-in and phone number.
  assert(mock.state.waitConfirms.length === 1, 'ReservationWait confirmed the standby once')
  assert(mock.state.waitConfirms[0].sms === 'Y' && mock.state.waitConfirms[0].phone === '01012345678', `SMS opt-in sent: ${JSON.stringify(mock.state.waitConfirms[0])}`)
  assert(mock.state.waitConfirms[0].classChange === 'Y', 'class change allowed for 일반실 우선')

  await page.waitForSelector('.reservation-card.highlight:not(.waiting)', { timeout: 30000 })
  await page.screenshot({ path: join(shots, '07-seat-after-waitlist.png') })
  const seatBox = await page.textContent('.reservation-card.highlight .success-box')
  assert(seatBox.includes('예약번호') && seatBox.includes('KTX-산천 005편'), `real seat reserved on 005: ${seatBox}`)
  assert(mock.state.reservations.filter((r) => r.h_rsv_tp_cd === '8').length === 1, 'the waiting list was joined exactly once')
  assert(mock.state.reservations.filter((r) => r.h_rsv_tp_cd !== '8').length === 1, 'one real reservation')
  const log2 = await page.textContent('[data-testid="log"]')
  assert(log2.includes('예약대기 등록 완료') && log2.includes('예약대기 1건'), 'log explains the waiting list and reminds to cancel it')
  assert(log2.includes('좌석 배정 알림을 010-1234-5678'), 'log confirms the SMS opt-in')
  await page.waitForFunction(() => document.querySelectorAll('.reservations li').length === 2, null, { timeout: 10000 })
  assert((await page.$$('.reservations .tag.waiting')).length === 1, 'the list tags the waiting-list entry')
  const listText = await page.textContent('.reservations')
  assert(!listText.includes('0000-00-00') && !listText.includes('기한 경과'), `list shows no bogus deadline: ${listText}`)

  await page.click('.reservations button:has-text("예약대기 취소")')
  await page.waitForFunction(() => document.querySelectorAll('.reservations li').length === 1, null, { timeout: 10000 })
  await page.click('.reservations button:has-text("예약 취소")')
  await page.waitForFunction(() => document.querySelectorAll('.reservations li').length === 0, null, { timeout: 10000 })
  assert(mock.state.reservations.length === 0, 'both entries cancelled on the server')
  console.log('E2E OK — requests:', mock.state.log.length, 'schedule calls:', mock.state.scheduleCalls)
} finally {
  await app.close()
  await mock.close()
}
