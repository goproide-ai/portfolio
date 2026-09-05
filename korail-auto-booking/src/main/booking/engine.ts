import { EventEmitter } from 'node:events'
import type { BookingConfig, BookingState, LogEntry, LogLevel, Reservation, Train } from '../../shared/types'
import type { KorailClient } from '../korail/client'
import { DynaPathError, KorailError, NeedToLoginError, NetworkError, NoResultsError, SoldOutError, describeError } from '../korail/errors'
import { normalizePassengers, totalPassengers } from '../korail/passengers'
import { describeTrain, selectCandidates, selectTargets, windowBounds } from './matcher'

/** Shown when Korail's anti-automation (매크로 방지) layer rejects a request. */
export const MACRO_BLOCK_MESSAGE =
  '코레일 매크로 방지(무결성) 검사에 걸렸습니다. 계정 보호를 위해 자동 예매를 중지합니다. 잠시 후 코레일+ 앱에서 직접 이용하세요.'

export interface EngineDeps {
  client: KorailClient
  /** Re-authenticate after the session expired. Return false when impossible. */
  relogin?: () => Promise<boolean>
  now?: () => number
  random?: () => number
}

export const MIN_INTERVAL_MS = 1_000
export const DEFAULT_INTERVAL_MS = 4_000
export const DEFAULT_JITTER_MS = 1_500
/** Give up after this many consecutive failed polling rounds. */
export const MAX_CONSECUTIVE_ERRORS = 30

export interface BookingEngineEvents {
  log: [LogEntry]
  state: [BookingState]
  success: [Reservation]
}

export function initialState(): BookingState {
  return {
    status: 'idle',
    attempts: 0,
    startedAt: null,
    lastCheckedAt: null,
    nextCheckAt: null,
    reservation: null,
    error: null,
    trains: [],
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export function validateConfig(input: BookingConfig): BookingConfig {
  const dep = (input.dep ?? '').trim()
  const arr = (input.arr ?? '').trim()
  if (!dep || !arr) throw new ConfigError('출발역과 도착역을 입력하세요.')
  if (dep === arr) throw new ConfigError('출발역과 도착역이 같습니다.')
  const date = (input.date ?? '').replace(/-/g, '')
  if (!/^\d{8}$/.test(date)) throw new ConfigError('날짜 형식이 올바르지 않습니다 (yyyyMMdd).')
  if (date < kstToday()) throw new ConfigError('출발일이 지난 날짜입니다. 날짜를 다시 선택하세요.')
  const timeFrom = (input.timeFrom ?? '').replace(':', '')
  const timeTo = (input.timeTo ?? '').replace(':', '')
  if (!/^\d{4}$/.test(timeFrom) || !/^\d{4}$/.test(timeTo)) throw new ConfigError('시간 형식이 올바르지 않습니다 (hh:mm).')
  if (timeFrom > timeTo) throw new ConfigError('시작 시각이 종료 시각보다 늦습니다.')
  const intervalMs = Math.max(MIN_INTERVAL_MS, Math.floor(Number(input.intervalMs) || DEFAULT_INTERVAL_MS))
  const jitterMs = Math.max(0, Math.floor(Number(input.jitterMs) || 0))
  const maxAttempts = Math.max(0, Math.floor(Number(input.maxAttempts) || 0))
  return {
    ...input,
    dep,
    arr,
    date,
    timeFrom,
    timeTo,
    categories: Array.isArray(input.categories) ? input.categories : [],
    targetTrainKeys: Array.isArray(input.targetTrainKeys) ? input.targetTrainKeys : [],
    passengers: normalizePassengers(input.passengers),
    seatPreference: input.seatPreference ?? 'GENERAL_FIRST',
    allowWaitingList: Boolean(input.allowWaitingList),
    intervalMs,
    jitterMs,
    maxAttempts,
  }
}

/** Today's date in Korea (yyyyMMdd); Korail schedules are in KST. */
export function kstToday(now: number = Date.now()): string {
  const kst = new Date(now + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, '0')}${String(kst.getUTCDate()).padStart(2, '0')}`
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const done = (): void => {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done)
  })
}

/**
 * Polls the Korail schedule for a date / time window and reserves the first
 * matching train that has a seat. Runs until success, stop() or a fatal error.
 */
export class BookingEngine extends EventEmitter<BookingEngineEvents> {
  private readonly deps: Required<Pick<EngineDeps, 'client' | 'now' | 'random'>> & Pick<EngineDeps, 'relogin'>
  private state: BookingState = initialState()
  private abort: AbortController | null = null
  private loopPromise: Promise<void> | null = null
  private config: BookingConfig | null = null

  constructor(deps: EngineDeps) {
    super()
    this.deps = {
      client: deps.client,
      relogin: deps.relogin,
      now: deps.now ?? (() => Date.now()),
      random: deps.random ?? Math.random,
    }
  }

  getState(): BookingState {
    return { ...this.state, trains: [...this.state.trains] }
  }

  getConfig(): BookingConfig | null {
    return this.config
  }

  get running(): boolean {
    return this.state.status === 'running'
  }

  start(input: BookingConfig): BookingState {
    if (this.running) throw new ConfigError('이미 자동 예매가 실행 중입니다.')
    if (!this.deps.client.loggedIn) throw new ConfigError('먼저 로그인하세요.')
    const config = validateConfig(input)
    this.config = config
    this.abort = new AbortController()
    this.state = { ...initialState(), status: 'running', startedAt: this.deps.now() }
    const { from, to } = windowBounds(config.timeFrom, config.timeTo)
    this.log(
      'info',
      `자동 예매 시작: ${config.dep} → ${config.arr}, ${config.date} ${from.slice(0, 2)}:${from.slice(2, 4)}~${to.slice(0, 2)}:${to.slice(2, 4)}, ` +
        `승객 ${totalPassengers(config.passengers)}명, ${seatPrefLabel(config.seatPreference)}${config.allowWaitingList ? ', 예약대기 허용' : ''}, ` +
        `${config.targetTrainKeys.length > 0 ? `지정 열차 ${config.targetTrainKeys.length}편` : '시간대 내 모든 열차'}, ` +
        `${(config.intervalMs / 1000).toFixed(1)}초 간격`,
    )
    this.emitState()
    const signal = this.abort.signal
    this.loopPromise = this.loop(config, signal).catch((e) => {
      this.finish('error', `예기치 않은 오류: ${describeError(e)}`)
    })
    return this.getState()
  }

  stop(): BookingState {
    if (this.running) {
      this.abort?.abort()
      this.finish('stopped', null)
      this.log('info', '자동 예매를 중지했습니다.')
    }
    return this.getState()
  }

  /** Wait for the loop to settle (tests). */
  async whenDone(): Promise<void> {
    await this.loopPromise
  }

  private async loop(config: BookingConfig, signal: AbortSignal): Promise<void> {
    let consecutiveErrors = 0
    while (!signal.aborted) {
      if (config.maxAttempts > 0 && this.state.attempts >= config.maxAttempts) {
        this.finish('stopped', `최대 시도 횟수(${config.maxAttempts}회)에 도달하여 중지했습니다.`)
        return
      }
      this.state.attempts += 1
      this.state.nextCheckAt = null
      this.emitState()

      try {
        const trains = await this.deps.client.searchWindow({
          dep: config.dep,
          arr: config.arr,
          date: config.date,
          timeFrom: config.timeFrom,
          timeTo: config.timeTo,
          passengers: config.passengers,
          shouldContinue: () => !signal.aborted,
        })
        if (signal.aborted) return
        this.state.trains = trains
        this.state.lastCheckedAt = this.deps.now()
        consecutiveErrors = 0

        const targets = selectTargets(trains, config)
        const candidates = selectCandidates(trains, config)
        this.log(
          candidates.length > 0 ? 'success' : 'info',
          `#${this.state.attempts} 조회 — 시간대 내 ${trains.length}편, 대상 ${targets.length}편, 예약 가능 ${candidates.length}편`,
        )
        if (targets.length === 0 && this.state.attempts === 1) {
          this.log('warn', '조건에 맞는 열차가 없습니다. 날짜/시간대/열차 종류를 확인하세요. 계속 재조회합니다.')
        }

        for (const train of candidates) {
          if (signal.aborted) return
          this.log('info', `예약 시도: ${describeTrain(train)} (${seatSummary(train)})`)
          try {
            const result = await this.deps.client.reserve(train, config.passengers, config.seatPreference, config.allowWaitingList)
            // A stop()/start() may have fired while reserve() was in flight; do not commit into a
            // stopped or superseded run (mirrors the abort re-check at every other await site).
            if (signal.aborted) return
            this.commitReservation(train, result.reservation ?? synthesizeReservation(train, result.pnrNo, config, result.waiting), result.waiting)
            return
          } catch (e) {
            if (e instanceof SoldOutError) {
              this.log('warn', `매진: ${describeTrain(train)} — 다른 열차를 시도합니다.`)
              continue
            }
            if (e instanceof DynaPathError) {
              this.finish('error', MACRO_BLOCK_MESSAGE)
              return
            }
            if (e instanceof NeedToLoginError) {
              const ok = await this.tryRelogin()
              if (!ok) return
              break
            }
            if (e instanceof NetworkError) {
              // reserve() may have committed the seat before the response was lost; reconcile
              // against existing reservations to avoid double-booking on the next poll.
              const match = await this.findExistingReservation(train)
              if (signal.aborted) return
              if (match) {
                this.commitReservation(train, match, match.waiting, '네트워크 오류 후 예약 확인됨')
                return
              }
              throw e
            }
            if (e instanceof KorailError) {
              this.log('error', `예약 실패: ${describeError(e)}`)
              continue
            }
            throw e
          }
        }
      } catch (e) {
        if (signal.aborted) return
        if (e instanceof DynaPathError) {
          // Korail's anti-automation layer flagged the request. Stop immediately instead of
          // hammering it further, which is exactly what escalates an account toward a block.
          this.finish('error', MACRO_BLOCK_MESSAGE)
          return
        }
        consecutiveErrors += 1
        if (e instanceof NeedToLoginError) {
          const ok = await this.tryRelogin()
          if (!ok) return
          consecutiveErrors = 0
        } else if (e instanceof NoResultsError) {
          this.log('info', `#${this.state.attempts} 조회 — 결과 없음`)
          consecutiveErrors = 0
        } else if (e instanceof NetworkError) {
          this.log('warn', `네트워크 오류 (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${e.message}`)
        } else {
          this.log('error', `조회 오류 (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${describeError(e)}`)
        }
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          this.finish('error', `오류가 ${MAX_CONSECUTIVE_ERRORS}회 연속 발생하여 중지했습니다.`)
          return
        }
      }

      if (signal.aborted) return
      const delay = config.intervalMs + Math.floor(this.deps.random() * config.jitterMs)
      this.state.nextCheckAt = this.deps.now() + delay
      this.emitState()
      await sleep(delay, signal)
    }
  }

  /** Record a successful reservation, finish the run, and emit success. */
  private commitReservation(train: Train, reservation: Reservation, waiting: boolean, prefix = ''): void {
    this.state.reservation = reservation
    this.finish('success', null)
    this.log(
      'success',
      `${prefix ? `${prefix}: ` : ''}${waiting ? '예약대기' : '예약'} 성공! 예약번호 ${reservation.rsvId} — ${describeTrain(train)}` +
        (reservation.buyLimitTime ? `, 결제기한 ${formatDeadline(reservation)}` : ''),
    )
    this.emit('success', reservation)
  }

  /** Look up whether this train is already reserved (used to recover from a lost reserve response). */
  private async findExistingReservation(train: Train): Promise<Reservation | null> {
    try {
      const existing = await this.deps.client.reservations()
      return (
        existing.find(
          (r) => r.trainNo === train.trainNo && r.runDate === train.runDate && r.depCode === train.depCode && r.arrCode === train.arrCode,
        ) ?? null
      )
    } catch {
      return null
    }
  }

  private async tryRelogin(): Promise<boolean> {
    this.log('warn', '세션이 만료되어 다시 로그인합니다.')
    if (!this.deps.relogin) {
      this.finish('error', '세션이 만료되었습니다. 다시 로그인한 뒤 시작하세요.')
      return false
    }
    try {
      const ok = await this.deps.relogin()
      if (!ok) {
        this.finish('error', '재로그인에 실패했습니다. 다시 로그인한 뒤 시작하세요.')
        return false
      }
      this.log('info', '재로그인 성공. 계속 진행합니다.')
      return true
    } catch (e) {
      this.finish('error', `재로그인 실패: ${describeError(e)}`)
      return false
    }
  }

  private finish(status: 'success' | 'stopped' | 'error', error: string | null): void {
    if (this.state.status !== 'running') return
    this.abort?.abort()
    this.state.status = status
    this.state.error = error
    this.state.nextCheckAt = null
    if (error) this.log(status === 'error' ? 'error' : 'info', error)
    this.emitState()
  }

  private emitState(): void {
    this.emit('state', this.getState())
  }

  private log(level: LogLevel, message: string): void {
    this.emit('log', { ts: this.deps.now(), level, message })
  }
}

export function seatPrefLabel(p: BookingConfig['seatPreference']): string {
  switch (p) {
    case 'GENERAL_ONLY':
      return '일반실만'
    case 'SPECIAL_FIRST':
      return '특실 우선'
    case 'SPECIAL_ONLY':
      return '특실만'
    default:
      return '일반실 우선'
  }
}

function seatSummary(t: Train): string {
  const parts: string[] = []
  if (t.hasGeneralSeat) parts.push('일반실')
  if (t.hasSpecialSeat) parts.push('특실')
  if (parts.length === 0 && t.hasWaitingList) parts.push('예약대기')
  return parts.join('·') || '좌석 없음'
}

function synthesizeReservation(train: Train, pnrNo: string, config: BookingConfig, waiting: boolean): Reservation {
  return {
    rsvId: pnrNo,
    journeyNo: '001',
    journeyCnt: '01',
    rsvChgNo: '00000',
    trainType: train.trainType,
    trainTypeName: train.trainTypeName,
    trainNo: train.trainNo,
    depName: train.depName,
    depCode: train.depCode,
    arrName: train.arrName,
    arrCode: train.arrCode,
    runDate: train.runDate,
    depTime: train.depTime,
    arrTime: train.arrTime,
    seatCount: totalPassengers(config.passengers),
    buyLimitDate: '',
    buyLimitTime: '',
    price: 0,
    waiting,
  }
}

export function formatDeadline(r: Pick<Reservation, 'buyLimitDate' | 'buyLimitTime'>): string {
  const d = r.buyLimitDate
  const t = r.buyLimitTime
  const date = d && d.length === 8 ? `${d.slice(4, 6)}/${d.slice(6, 8)} ` : ''
  const time = t && t.length >= 4 ? `${t.slice(0, 2)}:${t.slice(2, 4)}` : t
  return `${date}${time}`
}
