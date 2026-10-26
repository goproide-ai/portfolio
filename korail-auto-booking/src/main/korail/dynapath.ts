/**
 * `x-dynapath-m-token` — the app-integrity header the 코레일+ (formerly 코레일톡)
 * Android app attaches to login / schedule / reservation requests.
 *
 * 코레일+ 7.0.10 ships DynaPath SDK 2.0.1, whose token is produced by an obfuscated
 * native library. The server, however, only checks the token's version prefix:
 * live observations (devgyurak/pykorail, docs/protocol-evidence-7.0.10.json,
 * 2026-10-26) show that `201` + any alphanumeric body is accepted on the protected
 * endpoints, while the old SDK 1.x `bEeEP…` tokens are answered with
 * `-8204` ("update the app") on ScheduleView and `403 -1406` when malformed.
 *
 * So this module does not reproduce the native algorithm. It emits `201` plus a
 * fresh random alphanumeric body of the length the real app sends (324 characters
 * on login.Login, which carries a request binding, 222 elsewhere). If Korail ever
 * starts validating the body, this needs the native/hardware-backed signer, which
 * is out of scope for a desktop client.
 */
import { randomBytes } from 'node:crypto'

export const DYNAPATH_HEADER = 'x-dynapath-m-token'
/** DynaPath SDK version bundled in 코레일+ 7.0.10. */
export const DYNAPATH_SDK_VERSION = '2.0.1'
/** Token version prefix the server checks ("2.0.1" → 201). */
export const DYNAPATH_TOKEN_PREFIX = '201'
/** Observed total token length on ordinary protected requests (seatMovie.ScheduleView). */
export const DYNAPATH_TOKEN_LENGTH = 222
/** Observed total token length on login.Login, which carries a request binding. */
export const DYNAPATH_LOGIN_TOKEN_LENGTH = 324
/** The one protected path whose token is request-bound (longer). */
export const DYNAPATH_LOGIN_PATH = '/classes/com.korail.mobile.login.Login'

export const TOKEN_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
// Largest multiple of 62 below 256: bytes at or above it are discarded so every symbol is equally likely.
const UNBIASED_LIMIT = 248

/** `length` characters drawn uniformly from [0-9A-Za-z] using the OS CSPRNG. */
export function randomAlphanumeric(length: number): string {
  if (!Number.isInteger(length) || length < 0) throw new RangeError(`invalid length ${length}`)
  let out = ''
  while (out.length < length) {
    const bytes = randomBytes(length - out.length + 8)
    for (const b of bytes) {
      if (b >= UNBIASED_LIMIT) continue
      out += TOKEN_ALPHABET[b % TOKEN_ALPHABET.length]
      if (out.length === length) break
    }
  }
  return out
}

export function isRequestBoundPath(path: string): boolean {
  return path === DYNAPATH_LOGIN_PATH
}

/** Build one token. `requestBound` (login) selects the longer observed length. */
export function generateToken(requestBound = false, random: (n: number) => string = randomAlphanumeric): string {
  const length = requestBound ? DYNAPATH_LOGIN_TOKEN_LENGTH : DYNAPATH_TOKEN_LENGTH
  return DYNAPATH_TOKEN_PREFIX + random(length - DYNAPATH_TOKEN_PREFIX.length)
}

/** True when `value` has the shape the server accepts (prefix + alphanumeric body). */
export function looksLikeDynapathToken(value: string): boolean {
  return value.startsWith(DYNAPATH_TOKEN_PREFIX) && /^[0-9A-Za-z]+$/.test(value)
}

/** Per-process token source; `random` is injectable for tests. */
export class DynapathTokenGenerator {
  constructor(private readonly random: (n: number) => string = randomAlphanumeric) {}

  /** Token for the request path (login.Login gets the request-bound length). */
  token(path: string): string {
    return generateToken(isRequestBoundPath(path), this.random)
  }
}
