import type { LoginResult, Passengers, Reservation, SeatPreference, Train } from '../../shared/types'
import {
  API_VERSION,
  APP_KEY,
  COMMON_CODE_BOOTSTRAP_CODES,
  DEVICE,
  DEVICE_HEIGHT,
  DEVICE_MODEL,
  DEVICE_WIDTH,
  DYNAPATH_PATHS,
  ENDPOINTS,
  type Endpoints,
  JOB_ID,
  LOGIN_CIPHER_CODE,
  LOGIN_INPUT_FLAG,
  LOGIN_SUCCESS_CODES,
  MACRO_NOTICE_CODES,
  MAX_SCHEDULE_PAGES,
  OS_RELEASE,
  OS_SDK_INT,
  SEAT_CLASS,
  TRAIN_GROUP,
  buildUserAgent,
} from './constants'
import { generateSid, transformLoginPassword, type LoginCryptoInfo } from './crypto'
import { DYNAPATH_HEADER, DynapathTokenGenerator, buildDefaultSettings } from './dynapath'
import { DynaPathError, KorailError, LoginError, NeedToLoginError, NetworkError, NoResultsError, SoldOutError, describeNetworkFailure, errorFromResponse } from './errors'
import { extractReservationInfos, extractTrainInfos, parseReservation, parseTrain } from './parse'
import { normalizePassengers, reservePassengerParams, searchPassengerParams } from './passengers'

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface KorailClientOptions {
  /** Injectable fetch (tests). Defaults to global fetch. */
  fetch?: FetchLike
  device?: string
  /** App version string sent as `Version`. */
  version?: string
  /** Android release / model advertised in the User-Agent and the DynaPath token. */
  osRelease?: string
  deviceModel?: string
  userAgent?: string
  timeoutMs?: number
  /** Pause between the pages of one window scan so a wide window is not a burst of requests. */
  pageDelayMs?: number
  /** Debug logger. Never receives credentials. */
  logger?: (message: string) => void
  endpoints?: Partial<Endpoints>
  /** Clock override (tests). */
  now?: () => number
  /** Token generator override (tests). */
  dynapath?: DynapathTokenGenerator
}

export interface SearchOptions {
  dep: string
  arr: string
  /** yyyyMMdd */
  date: string
  /** hhmmss */
  time: string
  /** selGoTrain / txtTrnGpCd, defaults to 전체(109) */
  trainGroup?: string
  passengers?: Partial<Passengers>
}

export interface WindowSearchOptions {
  dep: string
  arr: string
  /** yyyyMMdd */
  date: string
  /** hhmm (inclusive) */
  timeFrom: string
  /** hhmm (inclusive, trains departing up to hh:mm:59) */
  timeTo: string
  trainGroup?: string
  passengers?: Partial<Passengers>
  /** Called after every page — lets callers abort a long scan. */
  shouldContinue?: () => boolean
}

export interface SearchTrainsOptions {
  /** Rethrow Korail's "no results" answer instead of returning [] (keeps the server's explanation). */
  throwOnNoResults?: boolean
}

export interface ReserveResult {
  pnrNo: string
  seatClass: '1' | '2'
  waiting: boolean
  reservation: Reservation | null
  /** For a waiting list: whether the standby options (ReservationWait) were confirmed. */
  waitConfirmed?: boolean
  /** Why the standby confirmation failed, when it did. */
  waitConfirmError?: string
}

export interface WaitingListOptions {
  /** Accept a seat of the other class if that is what frees up (txtPsrmClChgFlg). */
  allowClassChange?: boolean
  /** 10–11 digit mobile number for the seat-assignment SMS / 카카오톡 notice; empty = no notice. */
  smsPhone?: string
}

/** Digits only, 10–11 long, or '' when the input is not a usable Korean mobile number. */
export function normalizePhone(raw: string | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '')
  return /^01\d{8,9}$/.test(digits) ? digits : ''
}

export interface KorailUser {
  name: string
  membershipNumber: string
  email: string
}

type Json = Record<string, unknown>
type Params = Record<string, string | string[]>

/** Minimal single-host cookie jar that merges by name (JSESSIONID must survive unrelated Set-Cookie headers). */
export class CookieJar {
  private readonly cookies = new Map<string, string>()

  header(): string | undefined {
    if (this.cookies.size === 0) return undefined
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  store(setCookies: string[]): void {
    for (const line of setCookies) {
      const first = line.split(';', 1)[0]
      const eq = first.indexOf('=')
      if (eq <= 0) continue
      const name = first.slice(0, eq).trim()
      const value = first.slice(eq + 1).trim()
      if (!name) continue
      this.cookies.set(name, value)
    }
  }

  get(name: string): string | undefined {
    return this.cookies.get(name)
  }

  clear(): void {
    this.cookies.clear()
  }

  get size(): number {
    return this.cookies.size
  }
}

export function getSetCookies(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie()
  const raw = headers.get('set-cookie')
  if (!raw) return []
  // Split on commas that start a new cookie (name=value), not on Expires dates.
  return raw.split(/,(?=\s*[A-Za-z0-9_\-]+=)/).map((s) => s.trim())
}

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PHONE_HYPHEN_REGEX = /^(\d{3})-(\d{3,4})-(\d{4})$/
const PHONE_PLAIN_REGEX = /^(01\d)(\d{3,4})(\d{4})$/

/** Decide which txtInputFlg to send and normalise the id the way the server expects (phones need hyphens). */
export function classifyLoginId(rawId: string): { flag: string; value: string } {
  const id = rawId.trim()
  if (EMAIL_REGEX.test(id)) return { flag: LOGIN_INPUT_FLAG.email, value: id }
  if (PHONE_HYPHEN_REGEX.test(id)) return { flag: LOGIN_INPUT_FLAG.phone, value: id }
  const plain = id.match(PHONE_PLAIN_REGEX)
  if (plain) return { flag: LOGIN_INPUT_FLAG.phone, value: `${plain[1]}-${plain[2]}-${plain[3]}` }
  return { flag: LOGIN_INPUT_FLAG.membership, value: id }
}

/** hhmmss → hhmm00 one minute later, or null when the day would roll over. */
export function nextMinute(hhmmss: string): string | null {
  const h = parseInt(hhmmss.slice(0, 2), 10)
  const m = parseInt(hhmmss.slice(2, 4), 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  const total = h * 60 + m + 1
  if (total >= 24 * 60) return null
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}${String(nm).padStart(2, '0')}00`
}

/** Pick the seat class to reserve, mirroring the app's "일반실 우선" etc. options. */
export function chooseSeatClass(
  train: Pick<Train, 'hasGeneralSeat' | 'hasSpecialSeat' | 'hasWaitingList'>,
  preference: SeatPreference,
  allowWaitingList: boolean,
): { seatClass: '1' | '2'; waiting: boolean } | null {
  const general = train.hasGeneralSeat
  const special = train.hasSpecialSeat
  let seatClass: '1' | '2' | null = null
  switch (preference) {
    case 'GENERAL_ONLY':
      seatClass = general ? SEAT_CLASS.general : null
      break
    case 'SPECIAL_ONLY':
      seatClass = special ? SEAT_CLASS.special : null
      break
    case 'SPECIAL_FIRST':
      seatClass = special ? SEAT_CLASS.special : general ? SEAT_CLASS.general : null
      break
    case 'GENERAL_FIRST':
    default:
      seatClass = general ? SEAT_CLASS.general : special ? SEAT_CLASS.special : null
      break
  }
  if (seatClass) return { seatClass, waiting: false }
  if (allowWaitingList && preference !== 'SPECIAL_ONLY' && train.hasWaitingList) {
    return { seatClass: SEAT_CLASS.general, waiting: true }
  }
  return null
}

/** Pull the login-cipher object out of a common.code.do response (top level, `login`, or under `data`). */
export function extractLoginCryptoInfo(json: Json): LoginCryptoInfo | null {
  const candidates: unknown[] = [json[LOGIN_CIPHER_CODE], json.login]
  const data = json.data
  if (data && typeof data === 'object') {
    candidates.push((data as Json)[LOGIN_CIPHER_CODE], (data as Json).login)
  }
  candidates.push(json)
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue
    const obj = c as Json
    const key = obj.key === undefined || obj.key === null ? '' : String(obj.key)
    const idx = obj.idx === undefined || obj.idx === null ? '' : String(obj.idx)
    const flagRaw = String(obj.pwdAESCphd ?? obj.loginFlg ?? '').toUpperCase()
    if (!key && !idx && flagRaw !== 'N') continue
    const aes = flagRaw !== 'N'
    if (aes && !key) continue
    return { idx, key, aes }
  }
  return null
}

/**
 * Client for the 코레일+ mobile API.
 *
 * All methods throw `KorailError` subclasses for application level failures
 * and `NetworkError` for transport failures. The client keeps the session
 * cookie in memory only.
 */
export class KorailClient {
  private readonly fetchImpl: FetchLike
  private readonly device: string
  private _version: string
  private readonly userAgent: string
  private readonly timeoutMs: number
  private readonly pageDelayMs: number
  private readonly log: (message: string) => void
  private readonly endpoints: Endpoints
  private readonly now: () => number
  private readonly dynapath: DynapathTokenGenerator
  private readonly jar = new CookieJar()
  private _user: KorailUser | null = null

  constructor(options: KorailClientOptions = {}) {
    const f = options.fetch ?? (globalThis.fetch as FetchLike | undefined)
    if (!f) throw new Error('fetch is not available in this runtime')
    this.fetchImpl = f
    this.device = options.device ?? DEVICE
    this._version = options.version ?? API_VERSION
    const osRelease = options.osRelease ?? OS_RELEASE
    const deviceModel = options.deviceModel ?? DEVICE_MODEL
    this.userAgent = options.userAgent ?? buildUserAgent(osRelease, deviceModel)
    this.timeoutMs = options.timeoutMs ?? 15_000
    this.pageDelayMs = Math.max(0, options.pageDelayMs ?? 300)
    this.log = options.logger ?? (() => undefined)
    this.endpoints = { ...ENDPOINTS, ...(options.endpoints ?? {}) }
    this.now = options.now ?? (() => Date.now())
    this.dynapath =
      options.dynapath ?? new DynapathTokenGenerator(buildDefaultSettings({ osVersion: osRelease, deviceModel, appStartTs: this.now() }), this.now)
  }

  get loggedIn(): boolean {
    return this._user !== null
  }

  get user(): KorailUser | null {
    return this._user
  }

  get version(): string {
    return this._version
  }

  /** Let the user override the app version string without rebuilding (Korail bumps it with app releases). */
  set version(v: string) {
    const trimmed = v.trim()
    this._version = trimmed || API_VERSION
  }

  // ---------------------------------------------------------------- login

  private async fetchLoginCryptoInfo(): Promise<LoginCryptoInfo> {
    const json = await this.request('POST', this.endpoints.code, {
      Device: this.device,
      Version: this._version,
      Key: APP_KEY,
      code: [...COMMON_CODE_BOOTSTRAP_CODES],
      deviceWidth: DEVICE_WIDTH,
      deviceHeight: DEVICE_HEIGHT,
      OSVersion: OS_SDK_INT,
    })
    const info = extractLoginCryptoInfo(json)
    if (!info) {
      throw new LoginError('로그인 암호화 키를 받지 못했습니다. 코레일 서버 응답 형식이 바뀌었을 수 있습니다.', String(json.h_msg_cd ?? ''))
    }
    return info
  }

  async login(id: string, password: string): Promise<LoginResult> {
    this.jar.clear()
    this._user = null

    const crypto = await this.fetchLoginCryptoInfo()
    const { flag, value } = classifyLoginId(id)
    this.log(`login: input flag ${flag}, aes=${crypto.aes}`)

    const form: Params = {
      Device: this.device,
      Version: this._version,
      Key: APP_KEY,
      txtMemberNo: value,
      txtPwd: transformLoginPassword(password, crypto),
      txtInputFlg: flag,
      checkValidPw: 'Y',
    }
    if (crypto.idx) form.idx = crypto.idx

    let json: Json
    try {
      json = await this.request('POST', this.endpoints.login, form)
    } catch (e) {
      if (e instanceof KorailError && !(e instanceof NeedToLoginError) && !(e instanceof DynaPathError)) throw new LoginError(e.message, e.code)
      throw e
    }

    const code = String(json.h_msg_cd ?? '')
    const memberNo = String(json.strMbCrdNo ?? json.mbCrdNo ?? '')
    const success = json.strResult === 'SUCC' && (memberNo !== '' || LOGIN_SUCCESS_CODES.includes(code))
    if (!success) {
      if (json.strRedirectUrl) {
        throw new LoginError('코레일이 추가 인증을 요구합니다. 코레일+ 앱에서 먼저 로그인해 인증을 완료한 뒤 다시 시도하세요.', code)
      }
      const message = cleanMessage(json.h_msg_txt) || cleanMessage(json.strMsg) || '로그인에 실패했습니다. 아이디와 비밀번호를 확인하세요.'
      throw new LoginError(message, code)
    }
    if (!this.jar.get('JSESSIONID')) this.log('login: no JSESSIONID cookie in response')

    this._user = {
      name: String(json.strCustNm ?? ''),
      membershipNumber: memberNo,
      email: String(json.strEmailAdr ?? ''),
    }
    const result: LoginResult = { ok: true, name: this._user.name, membershipNumber: this._user.membershipNumber, email: this._user.email }
    const noti = String(json.notiTpCd ?? '')
    if (MACRO_NOTICE_CODES.includes(noti)) {
      result.message = `코레일이 이 계정에 매크로 의심 안내(${noti})를 보냈습니다. 조회 간격을 늘리고 사용을 자제하세요.`
    }
    return result
  }

  async logout(): Promise<void> {
    try {
      if (this.jar.size > 0) await this.rawRequest('GET', this.endpoints.logout, {})
    } catch (e) {
      this.log(`logout ignored: ${(e as Error).message}`)
    } finally {
      this.jar.clear()
      this._user = null
    }
  }

  // --------------------------------------------------------------- search

  /** One page (up to 10 trains) of ScheduleView. Returns every train the API lists, including sold-out ones. */
  async searchTrains(opts: SearchOptions, { throwOnNoResults = false }: SearchTrainsOptions = {}): Promise<Train[]> {
    const passengers = normalizePassengers(opts.passengers)
    const trainGroup = opts.trainGroup ?? TRAIN_GROUP.ALL
    const form: Params = {
      Device: this.device,
      Version: this._version,
      Sid: generateSid(this.now(), this.device),
      txtMenuId: '11',
      radJobId: '1',
      selGoTrain: trainGroup,
      txtTrnGpCd: trainGroup,
      txtGoStart: opts.dep,
      txtGoEnd: opts.arr,
      txtGoAbrdDt: opts.date,
      txtGoHour: opts.time,
      ...searchPassengerParams(passengers),
      txtSeatAttCd_2: '000',
      txtSeatAttCd_3: '000',
      txtSeatAttCd_4: '015',
      ebizCrossCheck: 'N',
      srtCheckYn: 'N',
      rtYn: 'N',
      adjStnScdlOfrFlg: 'N',
    }
    if (this._user?.membershipNumber) form.mbCrdNo = this._user.membershipNumber
    Object.assign(form, { qryDvCd: '1', qryStNo: '0', qryStTrnNo: '00000', qryStTrnNo2: '', pgPrCnt: '10' })

    let json: Json
    try {
      json = await this.request('POST', this.endpoints.schedule, form)
    } catch (e) {
      if (e instanceof NoResultsError && !throwOnNoResults) return []
      throw e
    }
    return extractTrainInfos(json).map(parseTrain)
  }

  /**
   * Scan a departure-time window by paging ScheduleView (the server caps each
   * answer at 10 trains) until the last train departs after the window.
   *
   * Throws `NoResultsError` (with Korail's own explanation) when the very first
   * page is empty; later empty pages just end the scan. Pages are spaced by
   * `pageDelayMs` so a wide window does not turn into a burst of requests.
   */
  async searchWindow(opts: WindowSearchOptions): Promise<Train[]> {
    const from = `${opts.timeFrom.replace(':', '').slice(0, 4)}00`
    const to = `${opts.timeTo.replace(':', '').slice(0, 4)}59`
    const seen = new Map<string, Train>()
    let time = from
    for (let page = 0; page < MAX_SCHEDULE_PAGES; page++) {
      const trains = await this.searchTrains({ ...opts, time }, { throwOnNoResults: page === 0 })
      if (trains.length === 0) break
      let added = 0
      for (const t of trains) {
        if (!seen.has(t.key)) {
          seen.set(t.key, t)
          added++
        }
      }
      const last = trains[trains.length - 1]
      if (last.depTime >= to || added === 0 || trains.length < 10) break
      const next = nextMinute(last.depTime)
      if (!next) break
      time = next
      if (opts.shouldContinue && !opts.shouldContinue()) break
      if (this.pageDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.pageDelayMs))
        if (opts.shouldContinue && !opts.shouldContinue()) break
      }
    }
    return [...seen.values()]
      .filter((t) => t.depTime >= from && t.depTime <= to)
      .sort((a, b) => (a.depTime < b.depTime ? -1 : a.depTime > b.depTime ? 1 : 0))
  }

  // -------------------------------------------------------------- reserve

  async reserve(
    train: Train,
    passengers: Partial<Passengers> | undefined,
    preference: SeatPreference = 'GENERAL_FIRST',
    allowWaitingList = false,
    waitOptions: WaitingListOptions = {},
  ): Promise<ReserveResult> {
    const choice = chooseSeatClass(train, preference, allowWaitingList)
    if (!choice) throw new SoldOutError()
    const psg = normalizePassengers(passengers)

    const json = await this.request('POST', this.endpoints.reserve, {
      Device: this.device,
      Version: this._version,
      Key: APP_KEY,
      txtMenuId: '11',
      txtJobId: choice.waiting ? JOB_ID.waiting : JOB_ID.reserve,
      txtGdNo: '',
      hidFreeFlg: 'N',
      txtStndFlg: 'N',
      ...reservePassengerParams(psg),
      txtSeatAttCd1: '000',
      txtSeatAttCd2: '000',
      txtSeatAttCd3: '000',
      txtSeatAttCd4: '015',
      txtSeatAttCd5: '000',
      txtPsrmClCd1: choice.seatClass,
      txtJrnyCnt: '1',
      txtJrnyTpCd1: '11',
      txtJrnySqno1: '001',
      txtTrnNo1: train.trainNo,
      txtTrnClsfCd1: train.trainType,
      txtTrnGpCd1: train.trainGroup,
      txtRunDt1: train.runDate,
      txtDptDt1: train.depDate,
      txtDptTm1: train.depTime,
      arvTm_1: train.arrTime,
      txtDptRsStnCd1: train.depCode,
      txtDptStnConsOrdr1: train.depConsOrder ?? '',
      txtDptStnRunOrdr1: train.depRunOrder ?? '',
      txtArvRsStnCd1: train.arrCode,
      txtArvStnConsOrdr1: train.arrConsOrder ?? '',
      txtArvStnRunOrdr1: train.arrRunOrder ?? '',
      txtChgFlg1: 'N',
    })

    const pnrNo = String(json.h_pnr_no ?? '')
    if (!pnrNo) throw new KorailError(cleanMessage(json.h_msg_txt) || '예약 응답에 예약번호가 없습니다.', String(json.h_msg_cd ?? ''))

    // A waiting list is a two-step registration in the app: TicketReservation (1102) creates the
    // hold (IRR000014 "예약대기 가능합니다."), then ReservationWait confirms the standby options.
    let waitConfirmed: boolean | undefined
    let waitConfirmError: string | undefined
    if (choice.waiting) {
      try {
        await this.confirmWaitingList(pnrNo, {
          allowClassChange: waitOptions.allowClassChange ?? (preference === 'GENERAL_FIRST' || preference === 'SPECIAL_FIRST'),
          smsPhone: waitOptions.smsPhone,
        })
        waitConfirmed = true
      } catch (e) {
        waitConfirmed = false
        waitConfirmError = e instanceof Error ? e.message : String(e)
        this.log(`waiting-list confirmation failed: ${waitConfirmError}`)
      }
    }

    let reservation: Reservation | null = null
    try {
      const list = await this.reservations()
      reservation = list.find((r) => r.rsvId === pnrNo) ?? null
      if (reservation) reservation = { ...reservation, waiting: choice.waiting }
    } catch (e) {
      this.log(`reservation lookup after reserve failed: ${(e as Error).message}`)
    }
    return { pnrNo, seatClass: choice.seatClass, waiting: choice.waiting, reservation, waitConfirmed, waitConfirmError }
  }

  /** Step two of a 예약대기: class-change consent and the seat-assignment SMS opt-in (IRZ000003 on success). */
  async confirmWaitingList(pnrNo: string, opts: WaitingListOptions = {}): Promise<void> {
    const phone = normalizePhone(opts.smsPhone)
    const form: Params = {
      Device: this.device,
      Version: this._version,
      Key: APP_KEY,
      txtPnrNo: pnrNo,
      txtPsrmClChgFlg: opts.allowClassChange ? 'Y' : 'N',
      txtSmsSndFlg: phone ? 'Y' : 'N',
    }
    if (phone) form.txtCpNo = phone
    await this.request('POST', this.endpoints.wait, form)
  }

  async reservations(): Promise<Reservation[]> {
    let json: Json
    try {
      json = await this.request('GET', this.endpoints.reservations, {
        Device: this.device,
        Version: this._version,
        Key: APP_KEY,
      })
    } catch (e) {
      if (e instanceof NoResultsError) return []
      throw e
    }
    return extractReservationInfos(json).map(parseReservation)
  }

  async cancel(rsv: Pick<Reservation, 'rsvId' | 'journeyNo' | 'journeyCnt' | 'rsvChgNo'>): Promise<boolean> {
    await this.request('POST', this.endpoints.cancel, {
      Device: this.device,
      Version: this._version,
      Key: APP_KEY,
      txtPnrNo: rsv.rsvId,
      txtJrnySqno: rsv.journeyNo,
      txtJrnyCnt: rsv.journeyCnt,
      hidRsvChgNo: rsv.rsvChgNo,
    })
    return true
  }

  // ------------------------------------------------------------ transport

  /** Perform a request and raise a typed error when strResult === 'FAIL'. */
  private async request(method: 'GET' | 'POST', url: string, params: Params): Promise<Json> {
    const json = await this.rawRequest(method, url, params)
    if (json.strResult === 'FAIL') {
      throw errorFromResponse(json.h_msg_cd as string | undefined, json.h_msg_txt as string | undefined)
    }
    return json
  }

  private needsDynapath(url: string): boolean {
    let path = url
    try {
      path = new URL(url).pathname
    } catch {
      // keep raw
    }
    return DYNAPATH_PATHS.includes(path)
  }

  private async rawRequest(method: 'GET' | 'POST', url: string, params: Params): Promise<Json> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    const headers: Record<string, string> = { 'User-Agent': this.userAgent }
    const cookie = this.jar.header()
    if (cookie) headers.Cookie = cookie
    if (this.needsDynapath(url)) headers[DYNAPATH_HEADER] = this.dynapath.token()
    const search = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) for (const item of v) search.append(k, item)
      else search.append(k, v)
    }
    const query = search.toString()
    let target = url
    let body: string | undefined
    if (method === 'GET') {
      if (query) target = url + (url.includes('?') ? '&' : '?') + query
    } else {
      body = query
      headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
    }
    this.log(`${method} ${redactUrl(method === 'GET' ? target : `${url}?${query}`)}`)

    let res: Response
    let text: string
    try {
      res = await this.fetchImpl(target, { method, headers, body, signal: controller.signal, redirect: 'follow' })
      text = await res.text()
    } catch (e) {
      const aborted = (e as Error)?.name === 'AbortError'
      throw new NetworkError(aborted ? `요청 시간 초과 (${this.timeoutMs}ms) — 네트워크 상태를 확인하세요.` : describeNetworkFailure(e), e)
    } finally {
      clearTimeout(timer)
    }
    this.jar.store(getSetCookies(res))

    const dynapathResult = res.headers.get('dynapath-result')
    if (res.status === 403 && dynapathResult !== null && Number(dynapathResult) < 0) {
      let message = ''
      try {
        message = cleanMessage((JSON.parse(text) as Json).message)
      } catch {
        // not JSON
      }
      throw new DynaPathError(message ? `코레일 매크로 방지 검사 거부: ${message}` : undefined, `DYNAPATH${dynapathResult}`)
    }
    if (!res.ok) {
      if (/MACRO\s*ERROR/i.test(text)) throw new DynaPathError()
      throw new NetworkError(`코레일 서버 응답 오류 (HTTP ${res.status})`)
    }
    try {
      return JSON.parse(text) as Json
    } catch (e) {
      if (/MACRO\s*ERROR/i.test(text)) throw new DynaPathError()
      throw new NetworkError(`응답을 해석할 수 없습니다: ${text.slice(0, 120).replace(/\s+/g, ' ')}`, e)
    }
  }
}

function cleanMessage(v: unknown): string {
  if (typeof v !== 'string') return ''
  return v.replace(/\s+/g, ' ').trim()
}

/** Strip secrets from a URL before logging it. */
export function redactUrl(url: string): string {
  return url.replace(/(txtPwd|Key|txtMemberNo|Sid|mbCrdNo)=[^&]*/g, '$1=***')
}
