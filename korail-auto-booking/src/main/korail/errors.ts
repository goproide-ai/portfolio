import { ERROR_CODES } from './constants'

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
 * `DynaPath-Result` header, or a "MACRO ERROR" / "앱을 최신 버전으로 업데이트" body.
 */
export class DynaPathError extends KorailError {
  constructor(message = '코레일 서버가 앱 무결성(매크로 방지) 검사에서 요청을 거부했습니다. 앱 버전 값이나 토큰 형식이 바뀌었을 수 있습니다.', code = 'DYNAPATH') {
    super(message, code)
    this.name = 'DynaPathError'
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

/** Map a FAIL response to the most specific error class. */
export function errorFromResponse(code: string | undefined, text: string | undefined): KorailError {
  const c = (code ?? '').trim()
  const msg = (text ?? '').replace(/\s+/g, ' ').trim()
  if ((ERROR_CODES.needLogin as readonly string[]).includes(c)) return new NeedToLoginError(c, msg || undefined)
  if ((ERROR_CODES.noResults as readonly string[]).includes(c)) return new NoResultsError(c, msg || undefined)
  if ((ERROR_CODES.soldOut as readonly string[]).includes(c)) return new SoldOutError(c, msg || undefined)
  if (/MACRO\s*ERROR/i.test(msg)) return new DynaPathError(msg, c || 'DYNAPATH')
  return new KorailError(msg || `코레일 API 오류 (${c || '코드 없음'})`, c)
}

export function isKorailError(e: unknown): e is KorailError {
  return e instanceof KorailError
}

export function describeError(e: unknown): string {
  if (e instanceof KorailError) return e.code ? `${e.message} [${e.code}]` : e.message
  if (e instanceof Error) return e.message
  return String(e)
}
