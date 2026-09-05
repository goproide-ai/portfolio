/**
 * 코레일+ (formerly 코레일톡) mobile API endpoints and protocol constants.
 *
 * Values follow the app (v6.5.0, 2026) as documented by the open-source
 * reverse-engineering projects korail2 (PR #54), yakisoba0728/korail-mobile-api,
 * leegyurak/pykorail and ppcciiss2-ux/sudol. Everything Korail is likely to
 * change (version string, device identity) lives here so it can be fixed in
 * one place, and the most fragile value (Version) can be overridden at runtime.
 */

export const KORAIL_HOST = 'smart.letskorail.com'
export const KORAIL_BASE = `https://${KORAIL_HOST}:443`

export interface Endpoints {
  code: string
  login: string
  logout: string
  schedule: string
  reserve: string
  reservations: string
  cancel: string
  tickets: string
  stationData: string
}

/** Build the endpoint table for a base URL (lets tests / a host change point elsewhere). */
export function endpointsFor(base: string): Endpoints {
  const mobile = `${base.replace(/\/+$/, '')}/classes/com.korail.mobile`
  return {
    code: `${mobile}.common.code.do`,
    login: `${mobile}.login.Login`,
    logout: `${mobile}.login.Logout`,
    schedule: `${mobile}.seatMovie.ScheduleView`,
    reserve: `${mobile}.certification.TicketReservation`,
    reservations: `${mobile}.reservation.ReservationView`,
    cancel: `${mobile}.reservationCancel.ReservationCancelChk`,
    tickets: `${mobile}.myTicket.MyTicketList`,
    stationData: `${mobile}.common.stationdata`,
  }
}

export const ENDPOINTS: Endpoints = endpointsFor(KORAIL_BASE)

/** Request paths that carry the `x-dynapath-m-token` app-integrity header. */
export const DYNAPATH_PATHS: readonly string[] = [
  '/classes/com.korail.mobile.certification.TicketReservation',
  '/classes/com.korail.mobile.nonMember.NonMemTicket',
  '/classes/com.korail.mobile.seatMovie.ScheduleView',
  '/classes/com.korail.mobile.seatMovie.ScheduleViewSpecial',
  '/classes/com.korail.mobile.trn.prcFare.do',
  '/classes/com.korail.mobile.login.Login',
]

/** Device identifier sent with every request ('AD' = Android). */
export const DEVICE = 'AD'
/** App version string (com.korail.talk 6.5.0). Korail rejects stale values, so keep this current. */
export const API_VERSION = '250601003'
/** Static app key sent on login / reservation; the session itself is the JSESSIONID cookie. */
export const APP_KEY = 'korail1234567890'
/** Build.VERSION.RELEASE / Build.MODEL advertised in the User-Agent and the DynaPath token (must agree). */
export const OS_RELEASE = '15'
export const DEVICE_MODEL = 'Android'
/** Build.VERSION.SDK_INT and screen size sent to common.code.do at startup. */
export const OS_SDK_INT = '35'
export const DEVICE_WIDTH = '1080'
export const DEVICE_HEIGHT = '2400'

export function buildUserAgent(osRelease: string, deviceModel: string): string {
  return `Dalvik/2.1.0 (Linux; U; Android ${osRelease}; ${deviceModel})`
}

export const USER_AGENT = buildUserAgent(OS_RELEASE, DEVICE_MODEL)

/** Code that yields the AES key for the password (`app.login.cphd`). */
export const LOGIN_CIPHER_CODE = 'app.login.cphd'

/** The app asks common.code.do for all of these at startup; the login key rides along. */
export const COMMON_CODE_BOOTSTRAP_CODES: readonly string[] = [
  'app.display.image',
  'app.menu.railpoint',
  'app.main.popup',
  'app.easyLogin.isShow',
  'app.korail.boss',
  'app.menu.buynow',
  'app.menu.lost112',
  'app.event.easyPay',
  'app.hndy.athn',
  'app.view.visibility',
  'app.menu.biz',
  'app.event.point',
  'app.var.data',
  LOGIN_CIPHER_CODE,
  'app.illegal.report',
  'app.holiday.popup',
  'app.MaaS.test',
  'app.limousine.mainMsg',
]

/** Fixed AES key (= IV) for the `Sid` field: AES-CBC("AD" + epoch ms). */
export const SID_KEY = '2485dd54d9deaa36'

/** txtInputFlg values for login. */
export const LOGIN_INPUT_FLAG = {
  membership: '2',
  phone: '4',
  email: '5',
} as const

/** h_msg_cd values that mean a successful login even when strMbCrdNo is absent. */
export const LOGIN_SUCCESS_CODES: readonly string[] = ['IRZ000001', 'S200']

/** notiTpCd values on login meaning Korail flagged the account for macro-like use. */
export const MACRO_NOTICE_CODES: readonly string[] = ['MC', 'MM', 'MS']

/** selGoTrain / txtTrnGpCd values (train group used when searching). */
export const TRAIN_GROUP = {
  KTX: '100',
  SAEMAEUL: '101',
  MUGUNGHWA: '102',
  TONGGUEN: '103',
  ITX_CHEONGCHUN: '104',
  AIRPORT: '105',
  ALL: '109',
} as const

/** txtPsrmClCd — 좌석 등급 */
export const SEAT_CLASS = {
  general: '1',
  special: '2',
} as const

/** txtJobId — 1101 좌석 예약, 1102 예약대기 */
export const JOB_ID = {
  reserve: '1101',
  waiting: '1102',
} as const

export type PassengerRowKey = 'adult' | 'youth' | 'child' | 'toddler' | 'senior' | 'disability1to3' | 'disability4to6' | 'guideDog'

/** The eight passenger rows the reservation request always carries, in wire order. */
export const PASSENGER_ROWS: ReadonlyArray<{ key: PassengerRowKey; type: string; discount: string; label: string }> = [
  { key: 'adult', type: '1', discount: '000', label: '어른' },
  { key: 'youth', type: '1', discount: 'P11', label: '청소년' },
  { key: 'child', type: '3', discount: '000', label: '어린이' },
  { key: 'toddler', type: '3', discount: '321', label: '유아' },
  { key: 'senior', type: '1', discount: '131', label: '경로' },
  { key: 'disability1to3', type: '1', discount: '111', label: '중증장애인' },
  { key: 'disability4to6', type: '1', discount: '112', label: '경증장애인' },
  { key: 'guideDog', type: '1', discount: '173', label: '안내견' },
]

/** Seat availability codes (h_gen_rsv_cd / h_spe_rsv_cd). */
export const SEAT_AVAILABLE = '11'
export const SEAT_SOLD_OUT = '13'
export const SEAT_NONE = '00'
/** h_wait_rsv_flg value meaning a waiting-list reservation is possible (the app compares against " 9"). */
export const WAITING_LIST_AVAILABLE = 9
/** strResult=SUCC + this h_msg_cd means a 예약대기 hold was registered. */
export const STANDBY_HOLD_CODE = 'IRR000014'

/** Error codes returned in h_msg_cd. */
export const ERROR_CODES = {
  needLogin: ['P058'],
  noResults: ['P100', 'WRG000000', 'WRD000061', 'WRT300005'],
  soldOut: ['ERR211161', 'IRT010110'],
} as const

/** Maximum number of schedule pages (10 trains each) fetched when scanning a time window. */
export const MAX_SCHEDULE_PAGES = 8
