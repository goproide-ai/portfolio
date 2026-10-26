import { APP_VERSION_ERROR_CODE } from '../../shared/errorCodes'
import { ERROR_CODES, REJECTION_CODES } from './constants'

/** Base error for any FAIL response from the Korail API. */
export class KorailError extends Error {
  readonly code: string
  constructor(message: string, code = '') {
    super(message)
    this.name = 'KorailError'
    this.code = code
  }
}

/** P058 — session expired or not logged in. */
export class NeedToLoginError extends KorailError {
  constructor(code = 'P058', message = '로그인이 필요합니다.') {
    super(message, code)
    this.name = 'NeedToLoginError'
  }
}

/** No trains matched the query. */
export class NoResultsError extends KorailError {
  constructor(code = 'P100', message = '조회 결과가 없습니다.') {
    super(message, code)
    this.name = 'NoResultsError'
  }
}

/** The seat requested is no longer available. */
export class SoldOutError extends KorailError {
  constructor(code = 'ERR211161', message = '좌석이 매진되었습니다.') {
    super(message, code)
    this.name = 'SoldOutError'
  }
}

/** Login failed (wrong credentials, blocked account, ...). */
export class LoginError extends KorailError {
  constructor(message = '로그인에 실패했습니다.', code = '') {
    super(message, code)
    this.name = 'LoginError'
  }
}

/**
 * Korail's anti-automation layer (DynaPath) rejected the request: HTTP 403 with a
 * `DynaPath-Result` header or a `-1406` envelope, or a "MACRO ERROR" body.
 */
export class DynaPathError extends KorailError {
  constructor(
    message = '코레일 서버가 앱 무결성(매크로 방지) 검사에서 요청을 거부했습니다. 앱 버전 값이나 토큰 형식이 바뀌었을 수 있습니다. PC 시계가 정확한지도 확인하세요.',
    code = 'DYNAPATH',
  ) {
    super(message, code)
    this.name = 'DynaPathError'
  }
}

export const APP_VERSION_MESSAGE =
  '코레일이 앱 업데이트를 요구합니다. 이 프로그램이 코레일에 보내는 코레일+ 앱 버전 값이 오래되었습니다. ' +
  "새 버전의 프로그램을 받거나, 왼쪽 아래 '코레일+ 앱 버전 값 (고급)'에 Play 스토어의 최신 코레일+ 버전을 입력하세요."

/** Korail answered "update the app": the Version / AppVersion values this build sends are stale. */
export class AppVersionError extends KorailError {
  constructor(message = APP_VERSION_MESSAGE, code = APP_VERSION_ERROR_CODE) {
    super(message, code)
    this.name = 'AppVersionError'
  }
}

export const ACCESS_RESTRICTED_MESSAGE =
  '코레일이 이 실행 환경에서의 이용을 제한했습니다(실행 환경 검증). 같은 요청을 바로 반복하면 제한이 길어질 수 있습니다. ' +
  '잠시 기다린 뒤 코레일+ 앱에서 정상 이용되는지 확인하고 다시 시도하세요.'

/** `{code: "-2000"}` envelope: Korail restricted this client/account after its environment check. Never retry at once. */
export class AccessRestrictedError extends KorailError {
  constructor(message = ACCESS_RESTRICTED_MESSAGE, code = 'ACCESS_RESTRICTED') {
    super(message, code)
    this.name = 'AccessRestrictedError'
  }
}

/** Network / transport level failure (timeout, DNS, non-JSON body). */
export class NetworkError extends Error {
  readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'NetworkError'
    this.cause = cause
  }
}

/**
 * Server messages that mean "your app version is too old" rather than a real failure of the request.
 * The live -8204 text is "원활한 예매 및 결제 서비스를 위해 최신 버전으로 업데이트해 주세요. …", so a bare
 * "최신 버전으로 업데이트" counts too; "예약 정보가 업데이트되었습니다" must not.
 */
const APP_UPDATE_REGEX =
  /(앱|어플|애플리케이션|app)[^.]{0,24}(업데이트|최신\s*버전)|(업데이트|최신\s*버전)[^.]{0,24}(앱|어플|애플리케이션|app)|최신\s*버전(으로|을|에)?\s*(업데이트|갱신|설치)/i

/**
 * Always coded APP_VERSION so every layer (engine, IPC flattening, renderer banner) recognises it;
 * the server's own code and text ride along in the message.
 */
function appVersionError(code: string, msg: string): AppVersionError {
  const detail = [code ? `서버 코드 ${code}` : '', msg ? `서버 메시지: ${msg}` : ''].filter(Boolean).join(', ')
  return new AppVersionError(detail ? `${APP_VERSION_MESSAGE} (${detail})` : APP_VERSION_MESSAGE)
}

/** Map a FAIL response to the most specific error class. */
export function errorFromResponse(code: string | undefined, text: string | undefined): KorailError {
  const c = (code ?? '').trim()
  const msg = (text ?? '').replace(/\s+/g, ' ').trim()
  if ((ERROR_CODES.needLogin as readonly string[]).includes(c)) return new NeedToLoginError(c, msg || undefined)
  if ((ERROR_CODES.noResults as readonly string[]).includes(c)) return new NoResultsError(c, msg || undefined)
  if ((ERROR_CODES.soldOut as readonly string[]).includes(c)) return new SoldOutError(c, msg || undefined)
  if ((ERROR_CODES.appVersion as readonly string[]).includes(c)) return appVersionError(c, msg)
  if (/MACRO\s*ERROR/i.test(msg)) return new DynaPathError(msg, c || 'DYNAPATH')
  if (APP_UPDATE_REGEX.test(msg)) return appVersionError(c, msg)
  return new KorailError(msg || `코레일 API 오류 (${c || '코드 없음'})`, c)
}

/**
 * Map a rejection envelope that is not a Korail `strResult` answer — `{code, message}` on an
 * HTTP 403 (이용 제한 -2000, 매크로 도구 -1406) or the app-version gate — to an error, or null
 * when the body is not one of those known envelopes. An unknown code is deliberately left to the
 * caller's HTTP-status handling (NetworkError), so the engine backs off instead of re-polling at
 * full rate on a condition it does not understand.
 */
export function errorFromRejection(status: number, body: Record<string, unknown>): KorailError | null {
  const code = body.code === undefined || body.code === null ? '' : String(body.code).trim()
  const message = typeof body.message === 'string' ? body.message.replace(/\s+/g, ' ').trim() : ''
  if (!code) return null
  if (code === REJECTION_CODES.accessRestricted) {
    return new AccessRestrictedError(message ? `${ACCESS_RESTRICTED_MESSAGE} (서버 메시지: ${message})` : undefined)
  }
  if (code === REJECTION_CODES.macroTool) {
    return new DynaPathError(message ? `코레일 매크로 방지 검사 거부: ${message}` : undefined, `DYNAPATH${code}`)
  }
  if ((ERROR_CODES.appVersion as readonly string[]).includes(code)) return appVersionError(code, message)
  void status
  return null
}

export function isKorailError(e: unknown): e is KorailError {
  return e instanceof KorailError
}

interface ErrorLike {
  name?: string
  message?: string
  code?: string
  cause?: { code?: string; message?: string }
}

/**
 * Turn a raw transport failure (Node's `fetch failed` with an errno cause, or Chromium's
 * `net::ERR_*` from Electron's net.fetch) into a message that tells the user what to check.
 */
export function describeNetworkFailure(e: unknown): string {
  const err = (e ?? {}) as ErrorLike
  const detail = `${err.code ?? ''} ${err.cause?.code ?? ''} ${err.message ?? ''} ${err.cause?.message ?? ''}`
  if (/ENOTFOUND|EAI_AGAIN|ERR_NAME_NOT_RESOLVED|ERR_NAME_RESOLUTION_FAILED/i.test(detail)) {
    return '코레일 서버 주소를 찾을 수 없습니다. 인터넷 연결과 DNS 설정을 확인하세요.'
  }
  if (/ERR_INTERNET_DISCONNECTED|ENETUNREACH|ENETDOWN|ERR_NETWORK_CHANGED|ERR_ADDRESS_UNREACHABLE/i.test(detail)) {
    return '인터넷에 연결되어 있지 않습니다. 네트워크 연결을 확인하세요.'
  }
  if (/ERR_PROXY|ERR_TUNNEL_CONNECTION_FAILED/i.test(detail)) {
    return '프록시 서버에 연결할 수 없습니다. 운영체제의 프록시 설정을 확인하세요.'
  }
  if (/ECONNREFUSED|ERR_CONNECTION_REFUSED/i.test(detail)) {
    return '코레일 서버가 연결을 거부했습니다. 잠시 후 다시 시도하세요.'
  }
  if (/ECONNRESET|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ERR_CONNECTION_ABORTED|EPIPE|ERR_EMPTY_RESPONSE/i.test(detail)) {
    return '코레일 서버와의 연결이 끊어졌습니다. 잠시 후 다시 시도합니다.'
  }
  if (/ETIMEDOUT|ERR_CONNECTION_TIMED_OUT|ERR_TIMED_OUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT/i.test(detail)) {
    return '코레일 서버 연결 시간이 초과되었습니다. 네트워크 상태를 확인하세요.'
  }
  if (/CERT|certificate|ERR_SSL|ERR_TLS|UNABLE_TO_VERIFY|SELF_SIGNED|EPROTO|handshake|ERR_BAD_SSL/i.test(detail)) {
    return '보안 연결(TLS) 검증에 실패했습니다. 보안 프로그램이나 프록시가 HTTPS 연결을 가로채고 있는지, PC 시계가 정확한지 확인하세요.'
  }
  const raw = err.cause?.message || err.message || String(e)
  return `네트워크 오류: ${raw}`
}

export function describeError(e: unknown): string {
  if (e instanceof KorailError) return e.code ? `${e.message} [${e.code}]` : e.message
  if (e instanceof Error) return e.message
  return String(e)
}
