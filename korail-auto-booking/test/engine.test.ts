import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BookingEngine, ConfigError, validateConfig } from '../src/main/booking/engine'
import { NeedToLoginError, NetworkError, SoldOutError } from '../src/main/korail/errors'
import type { KorailClient } from '../src/main/korail/client'
import type { BookingConfig, LogEntry, Reservation, Train } from '../src/shared/types'

function train(no: string, depTime: string, gen: boolean, name = 'KTX'): Train {
  return {
    trainType: '00', trainTypeName: name, trainGroup: '100', trainNo: no,
    depName: '서울', depCode: '0001', depDate: '20260910', depTime, arrName: '부산', arrCode: '0020', arrDate: '20260910', arrTime: '103000', runDate: '20260910',
    depConsOrder: '000000', depRunOrder: '000000', arrConsOrder: '000000', arrRunOrder: '000000',
    reservePossible: true, reservePossibleName: '', generalSeat: gen ? '11' : '13', specialSeat: '13', waitReserveFlag: 0,
    hasGeneralSeat: gen, hasSpecialSeat: false, hasWaitingList: false, key: `20260910-${no}-0001-0020`,
  }
}

const reservation: Reservation = {
  rsvId: 'PNR1', journeyNo: '001', journeyCnt: '01', rsvChgNo: '00000', trainType: '00', trainTypeName: 'KTX', trainNo: '001',
  depName: '서울', depCode: '0001', arrName: '부산', arrCode: '0020', runDate: '20260910', depTime: '080000', arrTime: '103000',
  seatCount: 1, buyLimitDate: '20260910', buyLimitTime: '083000', price: 59800, waiting: false,
}

function baseConfig(over: Partial<BookingConfig> = {}): BookingConfig {
  return {
    dep: '서울', arr: '부산', date: '20260910', timeFrom: '08:00', timeTo: '10:00', categories: [],
    passengers: { adult: 1, child: 0, toddler: 0, senior: 0 }, targetTrainKeys: [], seatPreference: 'GENERAL_FIRST',
    allowWaitingList: false, intervalMs: 2000, jitterMs: 0, maxAttempts: 0, ...over,
  }
}

interface FakeClient {
  loggedIn: boolean
  searchWindow: ReturnType<typeof vi.fn>
  reserve: ReturnType<typeof vi.fn>
}

function fakeClient(): FakeClient {
  return { loggedIn: true, searchWindow: vi.fn(), reserve: vi.fn() }
}

function makeEngine(client: FakeClient, relogin?: () => Promise<boolean>) {
  const logs: LogEntry[] = []
  const engine = new BookingEngine({ client: client as unknown as KorailClient, relogin, random: () => 0 })
  engine.on('log', (e) => logs.push(e))
  return { engine, logs }
}

describe('validateConfig', () => {
  it('normalises and clamps', () => {
    const c = validateConfig(baseConfig({ date: '2026-09-10', timeFrom: '8:00'.padStart(5, '0'), intervalMs: 10, maxAttempts: -3 }))
    expect(c.date).toBe('20260910')
    expect(c.timeFrom).toBe('0800')
    expect(c.intervalMs).toBe(1000)
    expect(c.maxAttempts).toBe(0)
  })
  it('rejects bad input', () => {
    expect(() => validateConfig(baseConfig({ dep: '' }))).toThrow(ConfigError)
    expect(() => validateConfig(baseConfig({ arr: '서울' }))).toThrow(/같습니다/)
    expect(() => validateConfig(baseConfig({ timeFrom: '11:00', timeTo: '10:00' }))).toThrow(/늦습니다/)
    expect(() => validateConfig(baseConfig({ date: '2026/9/1' }))).toThrow(/날짜/)
  })
})

describe('BookingEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls until a seat appears, then reserves and stops', async () => {
    const client = fakeClient()
    client.searchWindow
      .mockResolvedValueOnce([train('001', '080000', false), train('002', '090000', false)])
      .mockResolvedValueOnce([train('001', '080000', false), train('002', '090000', true)])
    client.reserve.mockResolvedValue({ pnrNo: 'PNR1', seatClass: '1', waiting: false, reservation })
    const { engine, logs } = makeEngine(client)
    const success = vi.fn()
    engine.on('success', success)

    const state = engine.start(baseConfig())
    expect(state.status).toBe('running')
    await vi.advanceTimersByTimeAsync(0)
    expect(client.searchWindow).toHaveBeenCalledTimes(1)
    expect(client.reserve).not.toHaveBeenCalled()
    expect(engine.getState().nextCheckAt).not.toBeNull()

    await vi.advanceTimersByTimeAsync(2000)
    await engine.whenDone()
    expect(client.searchWindow).toHaveBeenCalledTimes(2)
    expect(client.reserve).toHaveBeenCalledTimes(1)
    expect(client.reserve.mock.calls[0][0].trainNo).toBe('002')
    expect(engine.getState().status).toBe('success')
    expect(engine.getState().reservation?.rsvId).toBe('PNR1')
    expect(success).toHaveBeenCalledWith(reservation)
    expect(logs.some((l) => l.level === 'success' && l.message.includes('예약 성공'))).toBe(true)
  })

  it('only targets the selected trains and skips sold-out races', async () => {
    const client = fakeClient()
    client.searchWindow.mockResolvedValue([train('001', '080000', true), train('002', '090000', true), train('003', '093000', true)])
    client.reserve.mockRejectedValueOnce(new SoldOutError()).mockResolvedValueOnce({ pnrNo: 'P', seatClass: '1', waiting: false, reservation: null })
    const { engine } = makeEngine(client)
    engine.start(baseConfig({ targetTrainKeys: ['20260910-002-0001-0020', '20260910-003-0001-0020'] }))
    await vi.advanceTimersByTimeAsync(0)
    await engine.whenDone()
    expect(client.reserve.mock.calls.map((c) => c[0].trainNo)).toEqual(['002', '003'])
    const st = engine.getState()
    expect(st.status).toBe('success')
    expect(st.reservation?.rsvId).toBe('P')
    expect(st.reservation?.trainNo).toBe('003')
  })

  it('filters by category and time window', async () => {
    const client = fakeClient()
    client.searchWindow.mockResolvedValue([train('001', '080000', true, '무궁화호'), train('002', '113000', true), train('003', '090000', true, 'ITX-새마을')])
    client.reserve.mockResolvedValue({ pnrNo: 'P', seatClass: '1', waiting: false, reservation: null })
    const { engine } = makeEngine(client)
    engine.start(baseConfig({ categories: ['KTX', 'ITX'] }))
    await vi.advanceTimersByTimeAsync(0)
    await engine.whenDone()
    expect(client.reserve.mock.calls.map((c) => c[0].trainNo)).toEqual(['003'])
  })

  it('re-logins when the session expires and continues', async () => {
    const client = fakeClient()
    client.searchWindow.mockRejectedValueOnce(new NeedToLoginError()).mockResolvedValueOnce([train('001', '080000', true)])
    client.reserve.mockResolvedValue({ pnrNo: 'P', seatClass: '1', waiting: false, reservation: null })
    const relogin = vi.fn().mockResolvedValue(true)
    const { engine } = makeEngine(client, relogin)
    engine.start(baseConfig())
    await vi.advanceTimersByTimeAsync(0)
    expect(relogin).toHaveBeenCalledTimes(1)
    expect(engine.getState().status).toBe('running')
    await vi.advanceTimersByTimeAsync(2000)
    await engine.whenDone()
    expect(engine.getState().status).toBe('success')
  })

  it('stops with an error when re-login is impossible', async () => {
    const client = fakeClient()
    client.searchWindow.mockRejectedValue(new NeedToLoginError())
    const { engine } = makeEngine(client)
    engine.start(baseConfig())
    await vi.advanceTimersByTimeAsync(0)
    await engine.whenDone()
    expect(engine.getState().status).toBe('error')
    expect(engine.getState().error).toMatch(/로그인/)
  })

  it('stops after maxAttempts', async () => {
    const client = fakeClient()
    client.searchWindow.mockResolvedValue([train('001', '080000', false)])
    const { engine } = makeEngine(client)
    engine.start(baseConfig({ maxAttempts: 3 }))
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(2000)
    await engine.whenDone()
    expect(client.searchWindow).toHaveBeenCalledTimes(3)
    expect(engine.getState().status).toBe('stopped')
    expect(engine.getState().attempts).toBe(3)
  })

  it('stop() interrupts the wait immediately', async () => {
    const client = fakeClient()
    client.searchWindow.mockResolvedValue([])
    const { engine } = makeEngine(client)
    engine.start(baseConfig({ intervalMs: 60_000 }))
    await vi.advanceTimersByTimeAsync(0)
    expect(engine.getState().status).toBe('running')
    engine.stop()
    await engine.whenDone()
    expect(engine.getState().status).toBe('stopped')
    await vi.advanceTimersByTimeAsync(120_000)
    expect(client.searchWindow).toHaveBeenCalledTimes(1)
  })

  it('tolerates transient network errors and keeps polling', async () => {
    const client = fakeClient()
    client.searchWindow.mockRejectedValueOnce(new NetworkError('timeout')).mockResolvedValueOnce([train('001', '080000', true)])
    client.reserve.mockResolvedValue({ pnrNo: 'P', seatClass: '1', waiting: false, reservation: null })
    const { engine, logs } = makeEngine(client)
    engine.start(baseConfig())
    await vi.advanceTimersByTimeAsync(0)
    expect(engine.getState().status).toBe('running')
    expect(logs.some((l) => l.level === 'warn' && l.message.includes('네트워크'))).toBe(true)
    await vi.advanceTimersByTimeAsync(2000)
    await engine.whenDone()
    expect(engine.getState().status).toBe('success')
  })

  it('refuses to start twice or without login', () => {
    const client = fakeClient()
    client.searchWindow.mockResolvedValue([])
    const { engine } = makeEngine(client)
    engine.start(baseConfig())
    expect(() => engine.start(baseConfig())).toThrow(/실행 중/)
    engine.stop()
    const loggedOut = fakeClient()
    loggedOut.loggedIn = false
    expect(() => makeEngine(loggedOut).engine.start(baseConfig())).toThrow(/로그인/)
  })

  it('applies jitter from the injected random source', async () => {
    const client = fakeClient()
    client.searchWindow.mockResolvedValue([])
    const now = 1_000_000
    const engine = new BookingEngine({ client: client as unknown as KorailClient, random: () => 0.5, now: () => now })
    engine.start(baseConfig({ intervalMs: 2000, jitterMs: 1000 }))
    await vi.advanceTimersByTimeAsync(0)
    expect(engine.getState().nextCheckAt).toBe(now + 2500)
    engine.stop()
  })
})
