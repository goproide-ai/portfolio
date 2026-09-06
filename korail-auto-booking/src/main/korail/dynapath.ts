/**
 * `x-dynapath-m-token` — the app-integrity header the 코레일+ (formerly 코레일톡)
 * Android app attaches to login / schedule / reservation requests. Korail's
 * server rejects at least `login.Login` without it ("MACRO ERROR").
 *
 * This is a TypeScript port of the algorithm documented by the open-source
 * projects yakisoba0728/korail-mobile-api (Apache-2.0, dynapath.py) and
 * ppcciiss2-ux/sudol (DynaPath.kt), which reverse engineered the STCLab
 * DynaPath SDK bundled in app v6.5.0. It is pure string / integer arithmetic;
 * the unit tests pin it byte-for-byte to the reference implementation.
 */
import { randomBytes } from 'node:crypto'

export const DYNAPATH_HEADER = 'x-dynapath-m-token'

const BASE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const RANDOM_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const TABLE_INDEX = 1
const DEFAULT_I8 = 161
const DEFAULT_I9 = 30
const DEFAULT_I10 = 2

export const DYNAPATH_APP_ID = 'com.korail.talk'
export const DYNAPATH_OS_TYPE = 'Android'
export const DYNAPATH_SDK_VERSION = 'v1.0.3'
/** SHA-256 of the APK signing certificate, truncated to 32 chars and wrapped like ArrayList.toString(). */
export const DYNAPATH_APP_SIGNATURE_HASH = '38ff229cb34c7dda8e28220a2d750cce'
export const DYNAPATH_AS_VALUE = `[${DYNAPATH_APP_SIGNATURE_HASH}]`

function primeTable(count: number): number[] {
  const primes: number[] = []
  let candidate = 2
  while (primes.length < count + 1) {
    let isPrime = true
    for (const p of primes) {
      if (p * p > candidate) break
      if (candidate % p === 0) {
        isPrime = false
        break
      }
    }
    if (isPrime) primes.push(candidate)
    candidate++
  }
  return primes.slice(1)
}

const PRIMES = primeTable(100)

function sdkPermuteAlphabet(value: string, multiplier: number, step: number): string {
  const length = value.length
  let blockSize = 1
  for (const prime of PRIMES) {
    if (prime <= length) blockSize = prime
    else break
  }

  const counts = new Array<number>(blockSize).fill(0)
  const chars = new Array<string>(blockSize).fill('')
  let factor = 1 % blockSize
  for (let idx = 0; idx < blockSize; idx++) {
    const target = (factor * step) % blockSize
    counts[target] += 1
    if (counts[target] === 1) chars[idx] = value[target]
    factor = (factor * multiplier) % blockSize
  }

  const encoded: string[] = []
  const missing: string[] = []
  for (let idx = 0; idx < blockSize; idx++) {
    const ch = chars[idx]
    if (ch) {
      encoded.push(ch)
      continue
    }
    for (let missingIdx = 0; missingIdx < blockSize; missingIdx++) {
      if (counts[missingIdx] === 0) {
        const replacement = value[missingIdx]
        chars[idx] = replacement
        missing.push(replacement)
        counts[missingIdx] = 1
        break
      }
    }
  }

  let bs = blockSize
  while (bs < length) {
    missing.push(value[bs])
    bs++
  }

  const missingText = missing.join('')
  if (missingText.length < PRIMES[0]) return encoded.join('') + missingText
  return encoded.join('') + sdkPermuteAlphabet(missingText, multiplier, step)
}

export function generateEncodingTable(index: number = TABLE_INDEX): string {
  const multiplier = PRIMES[index % 29]
  const step = PRIMES[Math.floor(index / 29) % 29]
  return sdkPermuteAlphabet(BASE_ALPHABET, multiplier, step)
}

export const DYNAPATH_ENCODING_TABLE = generateEncodingTable(TABLE_INDEX)

export function buildPrefix(table: string, tableIndex = TABLE_INDEX, i11 = DEFAULT_I10, i12 = DEFAULT_I9): string {
  return `${String.fromCharCode(97 + tableIndex)}${table[2]}${table[37]}${table[i11]}${table[i12 - 1]}`
}

/** The SDK's own variable-length 7-bit expansion of a string (not UTF-8). */
export function stringToXa1s(data: string): number[] {
  const result: number[] = []
  for (const ch of data) {
    const cp = ch.codePointAt(0) as number
    if (cp < 128) {
      result.push(cp)
    } else if (cp < 2048) {
      result.push(128 | ((cp >> 7) & 15))
      result.push(cp & 127)
    } else if (cp >= 262144) {
      result.push(160)
      result.push((cp >> 14) & 127)
      result.push((cp >> 7) & 127)
      result.push(cp & 127)
    } else if ((63488 & cp) !== 55296) {
      result.push(((cp >> 14) & 15) | 144)
      result.push((cp >> 7) & 127)
      result.push(cp & 127)
    }
  }
  return result
}

/** Fold the key string into one big integer that seeds the custom alphabet. */
export function makeDynapathKey(key: string): bigint {
  let value = 0n
  for (const ch of key) {
    const cp = ch.codePointAt(0) as number
    let bit = 32768
    for (let n = 0; n < 16; n++) {
      if ((bit & cp) !== 0) break
      bit >>= 1
    }
    value = value * BigInt(bit << 1) + BigInt(cp)
  }
  return value
}

function pickTableChar(baseTable: string, remainder: number, used: string): string {
  let count = 0
  for (const ch of baseTable) {
    if (!used.includes(ch)) {
      if (count === remainder) return ch
      count++
    }
  }
  return ' '
}

/** Lehmer-code style permutation: same seed → same custom alphabet. */
export function makeEncodeTable(seed: bigint, encodeSize: number, baseTable: string): string {
  let result = ''
  let temp = seed
  for (let i = 0; i < encodeSize; i++) {
    const divisor = BigInt(encodeSize - i)
    const remainder = Number(temp % divisor)
    result += pickTableChar(baseTable, remainder, result)
    temp /= divisor
  }
  return result
}

export function encodeNormalBe(data: string, table: string, i8 = DEFAULT_I8, i9 = DEFAULT_I9, i10 = DEFAULT_I10): string {
  const units = stringToXa1s(data)
  const out: string[] = []
  const arr = new Array<number>(i10 + 1).fill(0)

  let idx = 0
  let remain = units.length % i10
  const fullLen = units.length - remain

  while (idx < fullLen) {
    let value = 0
    for (let n = 0; n < i10; n++) {
      value = value * i8 + units[idx]
      idx++
    }
    for (let i = 0; i < i10 + 1; i++) {
      arr[i] = value % i9
      value = Math.floor(value / i9)
    }
    for (let i = i10; i >= 0; i--) out.push(table[arr[i]])
  }

  if (remain > 0) {
    let value = 0
    for (let n = 0; n < remain; n++) {
      value = value * i8 + units[idx]
      idx++
    }
    for (let i = 0; i < remain + 1; i++) {
      arr[i] = value % i9
      value = Math.floor(value / i9)
    }
    while (remain >= 0) {
      out.push(table[arr[remain]])
      remain--
    }
  }
  return out.join('')
}

/** Java URLEncoder.encode / python quote_plus(safe="*-._") */
export function javaUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+')
}

function javaFormEncode(fields: Array<[string, string]>): string {
  return fields.map(([k, v]) => `${javaUrlEncode(k)}=${javaUrlEncode(v)}`).join('&')
}

export interface DynapathSettings {
  /** 16 lowercase hex chars standing in for Settings.Secure.ANDROID_ID */
  deviceId: string
  asValue: string
  /** App start time (epoch ms) — the "it" field; keep stable for the process lifetime. */
  appStartTs: string
  /** Build.VERSION.RELEASE, e.g. "15" */
  osVersion: string
  /** Build.MODEL */
  deviceModel: string
  appId: string
  osType: string
  sdkVersion: string
  tableIndex: number
  table: string
  i8: number
  i9: number
  i10: number
  secureUser: boolean
  debug: boolean
  emulator: boolean
  hooked: boolean
}

export function generateDeviceId(): string {
  return randomBytes(8).toString('hex')
}

export function buildDefaultSettings(input: { osVersion: string; deviceModel: string; appStartTs?: number; deviceId?: string }): DynapathSettings {
  return {
    deviceId: input.deviceId ?? generateDeviceId(),
    asValue: DYNAPATH_AS_VALUE,
    appStartTs: String(input.appStartTs ?? Date.now()),
    osVersion: input.osVersion,
    deviceModel: input.deviceModel,
    appId: DYNAPATH_APP_ID,
    osType: DYNAPATH_OS_TYPE,
    sdkVersion: DYNAPATH_SDK_VERSION,
    tableIndex: TABLE_INDEX,
    table: DYNAPATH_ENCODING_TABLE,
    i8: DEFAULT_I8,
    i9: DEFAULT_I9,
    i10: DEFAULT_I10,
    secureUser: false,
    debug: false,
    emulator: false,
    hooked: false,
  }
}

export function randomNonce(length = 4): string {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += RANDOM_ALPHABET[bytes[i] % RANDOM_ALPHABET.length]
  return out
}

export function generateToken(settings: DynapathSettings, timestampMs: number = Date.now(), randomText: string = randomNonce()): string {
  const ts = String(timestampMs)
  const fields: Array<[string, string]> = [
    ['ai', settings.appId],
    ['di', settings.deviceId],
    ['as', settings.asValue],
    ['su', String(settings.secureUser)],
    ['dbg', String(settings.debug)],
    ['emu', String(settings.emulator)],
    ['hk', String(settings.hooked)],
    ['it', settings.appStartTs],
    ['ts', ts],
    // The app sends recent request deltas here; the reference implementations use a fixed "0".
    ['rt', '0'],
    ['os', settings.osVersion],
    ['dm', settings.deviceModel],
    ['st', settings.osType],
    ['sv', settings.sdkVersion],
  ]
  const payload = javaFormEncode(fields)
  const dynKey = `${settings.sdkVersion}+${randomText}+${ts}`
  const encodedKey = encodeNormalBe(dynKey, settings.table, settings.i8, settings.i9, settings.i10)
  const customTable = makeEncodeTable(makeDynapathKey(dynKey), settings.i9, settings.table)
  const encodedBody = encodeNormalBe(payload, customTable, settings.i8, settings.i9, settings.i10)
  const prefix = buildPrefix(settings.table, settings.tableIndex, settings.i10, settings.i9)
  return `${prefix}${settings.table[encodedKey.length]}${encodedKey}${encodedBody}`
}

/** One generator per app process: the device id and "it" stay stable, ts/nonce change per call. */
export class DynapathTokenGenerator {
  constructor(
    readonly settings: DynapathSettings,
    private readonly now: () => number = () => Date.now(),
    private readonly nonce: () => string = () => randomNonce(),
  ) {}

  token(timestampMs: number = this.now()): string {
    return generateToken(this.settings, timestampMs, this.nonce())
  }
}
