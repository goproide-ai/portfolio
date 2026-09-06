import { EventEmitter } from 'node:events'
import type { BookingConfig, BookingState, LogEntry, LogLevel, Reservation, Train } from '../../shared/types'
import { normalizePhone, type KorailClient } from '../korail/client'
import { AppVersionError, DynaPathError, KorailError, NeedToLoginError, NetworkError, NoResultsError, SoldOutError, describeError } from '../korail/errors'
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
/** Network failures back off exponentially from the polling interval up to this delay. */
export const MAX_ERROR_BACKOFF_MS = 60_000
/** More than this many session expiries inside RELOGIN_WINDOW_MS means Korail keeps dropping the session: stop. */
export const MAX_RELOGINS_PER_WINDOW = 6
export const RELOGIN_WINDOW_MS = 10 * 60_000

export interface BookingEngineEvents {
  log: [LogEntry]
  state: [BookingState]
  /** A seat was secured (or, with continueAfterWaitlist off, a waiting list joined) and the run ended. */
  success: [Reservation]
  /** A waiting list was joined and the run keeps looking for a real seat. */
  waitlisted: [Reservation]
}

export function initialState(): BookingState {
  return {
    status: 'idle',
    attempts: 0,
    startedAt: null,
    lastCheckedAt: null,
    nextCheckAt: null,
    reservation: null,
    waitlist: [],
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
    continueAfterWaitlist: input.continueAfterWaitlist === undefined ? true : Boolean(input.continueAfterWaitlist),
    waitlistSmsPhone: normalizePhone(input.waitlistSmsPhone),
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
  /** A reserve() whose answer was lost; must be looked up before any further reservation attempt. */
  private unconfirmed: Train | null = null
  private reloginTimes: number[] = []
  /** Once the target trains are known, polling is narrowed to their departure span. */
  private span: { timeFrom: string; timeTo: string } | null = null
  /** Train keys whose waiting list this account already joined: only a real seat counts for them. */
  private waitlisted = new Set<string>()

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
    return { ...this.state, trains: [...this.state.trains], waitlist: [...this.state.waitlist] }
  }

  /** The user cancelled a 예약대기 in the UI: drop it from the state (its train is not re-joined). */
  forgetWaitlist(rsvId: string): BookingState {
    this.state.waitlist = this.state.waitlist.filter((r) => r.rsvId !== rsvId)
    this.emitState()
    return this.getState()
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
    this.unconfirmed = null
    this.reloginTimes = []
    this.span = null
    this.waitlisted = new Set()
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
    let backoffMs = 0
    while (!signal.aborted) {
      if (config.maxAttempts > 0 && this.state.attempts >= config.maxAttempts) {
        this.finish('stopped', `최대 시도 횟수(${config.maxAttempts}회)에 도달하여 중지했습니다.`)
        return
      }
      this.state.attempts += 1
      this.state.nextCheckAt = null
      this.emitState()

      try {
        // A reserve() call whose response was lost may have succeeded on the server. Never book
        // again until that is settled, or a flaky network turns into two reservations.
        if (this.unconfirmed) {
          const pending = this.unconfirmed
          const match = await this.lookupReservation(pending)
          if (signal.aborted) return
          this.unconfirmed = null
          if (match) {
            if (this.settle(pending, match, match.waiting, config, '네트워크 오류 후 예약 확인됨')) return
          } else {
            this.log('info', `${describeTrain(pending)} 예약은 서버에 남아 있지 않습니다. 계속 진행합니다.`)
          }
        }
        if (this.state.attempts === 1 && config.allowWaitingList) await this.noteExistingWaitlists()

        const trains = await this.deps.client.searchWindow({
          dep: config.dep,
          arr: config.arr,
          date: config.date,
          timeFrom: this.span?.timeFrom ?? config.timeFrom,
          timeTo: this.span?.timeTo ?? config.timeTo,
          passengers: config.passengers,
          shouldContinue: () => !signal.aborted,
        })
        if (signal.aborted) return
        this.state.trains = trains
        this.state.lastCheckedAt = this.deps.now()
        consecutiveErrors = 0
        backoffMs = 0

        const targets = selectTargets(trains, config)
        const candidates = selectCandidates(trains, config, this.waitlisted)
        this.log(
          candidates.length > 0 ? 'success' : 'info',
          `#${this.state.attempts} 조회 — 시간대 내 ${trains.length}편, 대상 ${targets.length}편, 예약 가능 ${candidates.length}편`,
        )
        if (targets.length === 0 && this.state.attempts === 1) {
          this.log('warn', '조건에 맞는 열차가 없습니다. 날짜/시간대/열차 종류를 확인하세요. 계속 재조회합니다.')
        }
        // Specific trains were picked: from now on only page the part of the window they occupy,
        // which keeps the request count per poll (and the macro-detection exposure) minimal.
        if (!this.span && config.targetTrainKeys.length > 0 && targets.length > 0) {
          const times = targets.map((t) => t.depTime.slice(0, 4)).sort()
          this.span = { timeFrom: times[0], timeTo: times[times.length - 1] }
          if (this.span.timeFrom !== config.timeFrom || this.span.timeTo !== config.timeTo) {
            this.log('info', `지정 열차 기준으로 조회 범위를 ${fmtHm(this.span.timeFrom)}~${fmtHm(this.span.timeTo)}로 좁힙니다.`)
          }
        }

        for (const train of candidates) {
          if (signal.aborted) return
          const allowWaiting = config.allowWaitingList && !this.waitlisted.has(train.key)
          this.log('info', `${allowWaiting && !train.hasGeneralSeat && !train.hasSpecialSeat ? '예약대기 신청' : '예약 시도'}: ${describeTrain(train)} (${seatSummary(train)})`)
          try {
            const result = await this.deps.client.reserve(train, config.passengers, config.seatPreference, allowWaiting, { smsPhone: config.waitlistSmsPhone })
            // A stop()/start() may have fired while reserve() was in flight; do not commit into a
            // stopped or superseded run (mirrors the abort re-check at every other await site).
            if (signal.aborted) return
            if (result.waiting && result.waitConfirmed === false) {
              this.log('warn', `예약대기 옵션(좌석 배정 알림) 등록에 실패했습니다: ${result.waitConfirmError ?? '알 수 없는 오류'}. 코레일+ 앱의 예약 내역에서 좌석 배정 알림을 직접 신청하세요.`)
            } else if (result.waiting && config.waitlistSmsPhone) {
              this.log('info', `좌석 배정 알림을 ${config.waitlistSmsPhone.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3')} 번호로 신청했습니다.`)
            }
            const reservation = result.reservation ?? synthesizeReservation(train, result.pnrNo, config, result.waiting)
            if (this.settle(train, reservation, result.waiting, config)) return
            continue
          } catch (e) {
            if (e instanceof SoldOutError) {
              this.log('warn', `매진: ${describeTrain(train)} — 다른 열차를 시도합니다.`)
              continue
            }
            if (e instanceof DynaPathError) {
              this.finish('error', MACRO_BLOCK_MESSAGE)
              return
            }
            if (e instanceof AppVersionError) {
              this.finish('error', describeError(e))
              return
            }
            if (e instanceof NeedToLoginError) {
              const outcome = await this.tryRelogin()
              if (outcome === 'fatal') return
              break
            }
            if (e instanceof NetworkError) {
              // reserve() may have committed the seat before the response was lost; reconcile
              // against existing reservations to avoid double-booking on the next poll.
              let match: Reservation | null
              try {
                match = await this.lookupReservation(train)
              } catch (lookupError) {
                if (signal.aborted) return
                this.unconfirmed = train
                this.log('warn', `예약 결과를 확인하지 못했습니다 (${describeError(lookupError)}). 다음 조회 전에 다시 확인합니다.`)
                throw e
              }
              if (signal.aborted) return
              if (match) {
                if (this.settle(train, match, match.waiting, config, '네트워크 오류 후 예약 확인됨')) return
                continue
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
        if (e instanceof AppVersionError) {
          this.finish('error', describeError(e))
          return
        }
        consecutiveErrors += 1
        backoffMs = 0
        if (e instanceof NeedToLoginError) {
          const outcome = await this.tryRelogin()
          if (outcome === 'fatal') return
          if (outcome === 'ok') consecutiveErrors = 0
          else backoffMs = this.backoff(config, consecutiveErrors)
        } else if (e instanceof NoResultsError) {
          this.log('info', `#${this.state.attempts} 조회 — 결과 없음 (${e.message})`)
          consecutiveErrors = 0
        } else if (e instanceof NetworkError) {
          backoffMs = this.backoff(config, consecutiveErrors)
          this.log('warn', `네트워크 오류 (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${e.message} — ${(backoffMs / 1000).toFixed(0)}초 후 재시도`)
        } else {
          this.log('error', `조회 오류 (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${describeError(e)}`)
        }
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          this.finish('error', `오류가 ${MAX_CONSECUTIVE_ERRORS}회 연속 발생하여 중지했습니다. 네트워크 상태를 확인한 뒤 다시 시작하세요.`)
          return
        }
      }

      if (signal.aborted) return
      const delay = Math.max(config.intervalMs, backoffMs) + Math.floor(this.deps.random() * config.jitterMs)
      this.state.nextCheckAt = this.deps.now() + delay
      this.emitState()
      await sleep(delay, signal)
    }
  }

  /** Exponential backoff for transient failures: interval, 2×, 4×, … capped at MAX_ERROR_BACKOFF_MS. */
  private backoff(config: BookingConfig, consecutiveErrors: number): number {
    const factor = 2 ** Math.min(10, Math.max(0, consecutiveErrors - 1))
    return Math.min(MAX_ERROR_BACKOFF_MS, config.intervalMs * factor)
  }

  /**
   * Decide what a server-confirmed booking means for the run. A real seat (or a waiting list when
   * continueAfterWaitlist is off) ends the run; otherwise the waiting list is recorded and the run
   * keeps looking for a seat. Returns true when the run finished.
   */
  private settle(train: Train, reservation: Reservation, waiting: boolean, config: BookingConfig, prefix = ''): boolean {
    if (waiting && config.continueAfterWaitlist) {
      this.waitlisted.add(train.key)
      if (!this.state.waitlist.some((r) => r.rsvId === reservation.rsvId)) this.state.waitlist.push({ ...reservation, waiting: true })
      this.log(
        'success',
        `${prefix ? `${prefix}: ` : ''}예약대기 등록 완료 — 예약번호 ${reservation.rsvId}, ${describeTrain(train)}. ` +
          '좌석이 확보된 것은 아닙니다(취소표가 나오면 신청 순서대로 배정). 코레일+ 앱의 예약 내역(미결제 예약 조회)에서 확인되며, 좌석이 배정되면 결제기한이 생깁니다. 그동안 빈 좌석을 계속 찾습니다.',
      )
      this.emitState()
      this.emit('waitlisted', reservation)
      return false
    }
    this.commitReservation(train, reservation, waiting, prefix)
    return true
  }

  /** Record a successful reservation, finish the run, and emit success. */
  private commitReservation(train: Train, reservation: Reservation, waiting: boolean, prefix = ''): void {
    this.state.reservation = { ...reservation, waiting }
    this.finish('success', null)
    this.log(
      'success',
      waiting
        ? `${prefix ? `${prefix}: ` : ''}예약대기 등록 완료 — 예약번호 ${reservation.rsvId}, ${describeTrain(train)}. 좌석이 배정되면 코레일+ 앱에서 결제기한이 안내됩니다.`
        : `${prefix ? `${prefix}: ` : ''}예약 성공! 예약번호 ${reservation.rsvId} — ${describeTrain(train)}` +
            (reservation.buyLimitTime ? `, 결제기한 ${formatDeadline(reservation)}` : ''),
    )
    if (!waiting && this.state.waitlist.length > 0) {
      this.log(
        'warn',
        `이번 실행에서 등록한 예약대기 ${this.state.waitlist.length}건(예약번호 ${this.state.waitlist.map((r) => r.rsvId).join(', ')})은 필요 없으면 코레일+ 앱에서 취소하세요.`,
      )
    }
    this.emit('success', this.state.reservation)
  }

  /**
   * Waiting lists this account already holds (from an earlier run or the 코레일+ app) must not be
   * joined again; for those trains only a real seat counts. A failed lookup is not fatal.
   */
  private async noteExistingWaitlists(): Promise<void> {
    let existing: Reservation[]
    try {
      existing = await this.deps.client.reservations()
    } catch (e) {
      this.log('warn', `기존 예약 목록을 확인하지 못했습니다 (${describeError(e)}). 예약대기가 이미 있는 열차에 다시 신청될 수 있습니다.`)
      return
    }
    const keys = existing.filter((r) => r.waiting).map((r) => `${r.runDate}-${r.trainNo}-${r.depCode}-${r.arrCode}`)
    for (const k of keys) this.waitlisted.add(k)
    if (keys.length > 0) this.log('info', `기존 예약대기 ${keys.length}건 확인 — 해당 열차는 빈 좌석이 날 때만 예약합니다.`)
  }

  /**
   * Look up whether this train is already reserved (used to recover from a lost reserve
   * response). Throws when the lookup itself fails so the caller can tell "not reserved"
   * from "unknown".
   */
  private async lookupReservation(train: Train): Promise<Reservation | null> {
    const existing = await this.deps.client.reservations()
    return (
      existing.find(
        (r) => r.trainNo === train.trainNo && r.runDate === train.runDate && r.depCode === train.depCode && r.arrCode === train.arrCode,
      ) ?? null
    )
  }

  /**
   * Re-authenticate after a session expiry. 'ok' = continue at once, 'retry' = a transient
   * network failure, try again after the (backed-off) interval, 'fatal' = the run was finished.
   */
  private async tryRelogin(): Promise<'ok' | 'retry' | 'fatal'> {
    const now = this.deps.now()
    this.reloginTimes = this.reloginTimes.filter((t) => now - t < RELOGIN_WINDOW_MS)
    if (this.reloginTimes.length >= MAX_RELOGINS_PER_WINDOW) {
      this.finish(
        'error',
        `세션이 ${RELOGIN_WINDOW_MS / 60_000}분 안에 ${MAX_RELOGINS_PER_WINDOW}회 이상 만료되었습니다. 코레일이 이 계정의 세션을 계속 끊고 있을 수 있으니 ` +
          '잠시 후 코레일+ 앱에서 직접 로그인해 확인하세요.',
      )
      return 'fatal'
    }
    this.reloginTimes.push(now)
    this.log('warn', '세션이 만료되어 다시 로그인합니다.')
    if (!this.deps.relogin) {
      this.finish('error', '세션이 만료되었습니다. 다시 로그인한 뒤 시작하세요.')
      return 'fatal'
    }
    try {
      const ok = await this.deps.relogin()
      if (!ok) {
        this.finish('error', '재로그인에 실패했습니다. 다시 로그인한 뒤 시작하세요.')
        return 'fatal'
      }
      this.log('info', '재로그인 성공. 계속 진행합니다.')
      return 'ok'
    } catch (e) {
      if (e instanceof NetworkError) {
        this.log('warn', `재로그인 중 네트워크 오류: ${e.message} — 잠시 후 다시 시도합니다.`)
        return 'retry'
      }
      if (e instanceof DynaPathError) {
        this.finish('error', MACRO_BLOCK_MESSAGE)
        return 'fatal'
      }
      this.finish('error', `재로그인 실패: ${describeError(e)}`)
      return 'fatal'
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

function fmtHm(hhmm: string): string {
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`
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
