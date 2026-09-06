/**
 * Types shared between the Electron main process, the preload bridge and the renderer.
 * Keep this file free of Node/Electron imports so the renderer can import it too.
 */

/** 좌석 예약 가능 코드 (h_gen_rsv_cd / h_spe_rsv_cd) */
export type SeatCode = '11' | '13' | '00' | string

export interface Train {
  /** h_trn_clsf_cd — 열차 종류 코드 (00 KTX, 07 KTX-산천, 08 ITX-새마을, 09 ITX-청춘, 02 무궁화 ...) */
  trainType: string
  /** h_trn_clsf_nm — 열차 종류 이름 (KTX, KTX-산천, ITX-새마을, 무궁화호 ...) */
  trainTypeName: string
  /** h_trn_gp_cd — 열차 그룹 코드 (100 KTX 계열, 101 새마을, 102 무궁화 ...) */
  trainGroup: string
  /** h_trn_no — 열차 번호 */
  trainNo: string
  depName: string
  depCode: string
  /** yyyyMMdd */
  depDate: string
  /** hhmmss */
  depTime: string
  arrName: string
  arrCode: string
  arrDate: string
  arrTime: string
  /** h_run_dt — 운행 일자 yyyyMMdd */
  runDate: string
  /** h_dpt_stn_cons_ordr / h_dpt_stn_run_ordr — 출발역 구성/운행 순번 (예약 요청에 그대로 전달) */
  depConsOrder: string
  depRunOrder: string
  /** h_arv_stn_cons_ordr / h_arv_stn_run_ordr */
  arrConsOrder: string
  arrRunOrder: string
  /** h_rsv_psb_flg === 'Y' */
  reservePossible: boolean
  /** h_rsv_psb_nm — 예약 가능 여부 문구 */
  reservePossibleName: string
  /** h_gen_rsv_cd — 11 예약가능, 13 매진, 00 일반실 없음 */
  generalSeat: SeatCode
  /** h_spe_rsv_cd — 11 예약가능, 13 매진, 00 특실 없음 */
  specialSeat: SeatCode
  /** h_wait_rsv_flg — 9 예약대기 가능, 0 없음, -2 좌석 있음 */
  waitReserveFlag: number | null
  hasGeneralSeat: boolean
  hasSpecialSeat: boolean
  hasWaitingList: boolean
  /** 고유 키: `${runDate}-${trainNo}-${depCode}-${arrCode}` */
  key: string
}

export interface Reservation {
  /** h_pnr_no — 예약 번호 */
  rsvId: string
  journeyNo: string
  journeyCnt: string
  rsvChgNo: string
  trainType: string
  trainTypeName: string
  trainNo: string
  depName: string
  depCode: string
  arrName: string
  arrCode: string
  /** yyyyMMdd */
  runDate: string
  /** hhmmss */
  depTime: string
  arrTime: string
  /** 좌석 수 */
  seatCount: number
  /** 결제 기한 yyyyMMdd */
  buyLimitDate: string
  /** 결제 기한 hhmmss */
  buyLimitTime: string
  /** 예약 금액 (원) */
  price: number
  /** 예약대기 여부 (추정) */
  waiting: boolean
}

export interface Passengers {
  adult: number
  child: number
  toddler: number
  senior: number
}

export type SeatPreference = 'GENERAL_FIRST' | 'GENERAL_ONLY' | 'SPECIAL_FIRST' | 'SPECIAL_ONLY'

/** 열차 종류 카테고리 — 열차 종류 이름(h_trn_clsf_nm)으로 매칭한다. */
export type TrainCategory = 'KTX' | 'ITX' | 'SAEMAEUL' | 'MUGUNGHWA' | 'OTHER'

export interface SearchRequest {
  /** 출발역 이름 (예: 서울) */
  dep: string
  /** 도착역 이름 (예: 부산) */
  arr: string
  /** yyyyMMdd */
  date: string
  /** hhmm — 검색 시작 시각 */
  timeFrom: string
  /** hhmm — 검색 종료 시각 (이 시각 이전 출발 열차까지) */
  timeTo: string
  /** 비어 있으면 전체 */
  categories: TrainCategory[]
  passengers: Passengers
}

export interface BookingConfig extends SearchRequest {
  /** 노릴 열차 키 목록. 비어 있으면 시간대 내 조건에 맞는 모든 열차. */
  targetTrainKeys: string[]
  seatPreference: SeatPreference
  /** 좌석이 없을 때 예약대기라도 잡을지 */
  allowWaitingList: boolean
  /** 예약대기를 등록한 뒤에도 (좌석이 배정될 때까지) 빈 좌석을 계속 찾을지. 기본 true. */
  continueAfterWaitlist: boolean
  /** 좌석 배정 알림(문자·카카오톡)을 받을 휴대폰 번호. 비어 있으면 알림 신청 없음. */
  waitlistSmsPhone: string
  /** 재조회 간격 (ms) */
  intervalMs: number
  /** 간격에 더할 랜덤 지터 최대값 (ms) */
  jitterMs: number
  /** 0 이면 무제한 */
  maxAttempts: number
}

export type BookingStatus = 'idle' | 'running' | 'success' | 'stopped' | 'error'

export interface BookingState {
  status: BookingStatus
  attempts: number
  startedAt: number | null
  lastCheckedAt: number | null
  nextCheckAt: number | null
  /** 좌석이 확보된 예약 (예약대기만 등록된 경우에는 continueAfterWaitlist=false 일 때만 여기에 들어간다) */
  reservation: Reservation | null
  /** 이번 실행에서 등록한 예약대기 목록 — 좌석이 확보된 것이 아니다. */
  waitlist: Reservation[]
  error: string | null
  /** 마지막 조회에서 확인한 열차 목록 */
  trains: Train[]
}

export type LogLevel = 'info' | 'warn' | 'error' | 'success'

export interface LogEntry {
  ts: number
  level: LogLevel
  message: string
}

export interface LoginResult {
  ok: boolean
  name?: string
  membershipNumber?: string
  email?: string
  message?: string
}

export interface SessionInfo {
  loggedIn: boolean
  name?: string
  membershipNumber?: string
  email?: string
}

export interface SavedLogin {
  id: string
  hasPassword: boolean
}

export interface AppSettings {
  lastSearch: Partial<SearchRequest> | null
  seatPreference: SeatPreference
  allowWaitingList: boolean
  continueAfterWaitlist: boolean
  waitlistSmsPhone: string
  intervalMs: number
  jitterMs: number
  maxAttempts: number
  soundOnSuccess: boolean
  notifyOnSuccess: boolean
}

export interface AppInfo {
  version: string
  host: string
  apiVersion: string
  platform: string
}

/** API exposed to the renderer through contextBridge as `window.korail`. */
export interface KorailBridge {
  login(id: string, password: string, remember: boolean): Promise<LoginResult>
  loginWithSaved(): Promise<LoginResult>
  logout(): Promise<void>
  getSession(): Promise<SessionInfo>
  getSavedLogin(): Promise<SavedLogin | null>
  clearSavedLogin(): Promise<void>
  searchTrains(req: SearchRequest): Promise<Train[]>
  startBooking(config: BookingConfig): Promise<BookingState>
  stopBooking(): Promise<BookingState>
  getBookingState(): Promise<BookingState>
  /** Drop a cancelled 예약대기 from the running engine's state (the train is not re-joined). */
  forgetWaitlist(rsvId: string): Promise<BookingState>
  getReservations(): Promise<Reservation[]>
  cancelReservation(rsv: Reservation): Promise<boolean>
  getSettings(): Promise<AppSettings>
  saveSettings(patch: Partial<AppSettings>): Promise<AppSettings>
  getStations(): Promise<string[]>
  getAppInfo(): Promise<AppInfo>
  openExternal(url: string): Promise<void>
  onLog(cb: (entry: LogEntry) => void): () => void
  onState(cb: (state: BookingState) => void): () => void
}
