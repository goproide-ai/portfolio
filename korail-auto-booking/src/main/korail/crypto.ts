import { createCipheriv } from 'node:crypto'
import { SID_KEY } from './constants'

export function aesAlgorithmFor(keyLength: number): 'aes-128-cbc' | 'aes-192-cbc' | 'aes-256-cbc' {
  switch (keyLength) {
    case 16:
      return 'aes-128-cbc'
    case 24:
      return 'aes-192-cbc'
    case 32:
      return 'aes-256-cbc'
    default:
      throw new Error(`Unsupported AES key length: ${keyLength} bytes (expected 16, 24 or 32)`)
  }
}

/** AES-CBC with PKCS#7 padding. */
export function aesCbcEncrypt(plain: Buffer, key: Buffer, iv: Buffer): Buffer {
  if (iv.length !== 16) throw new Error(`AES IV must be 16 bytes, got ${iv.length}`)
  const cipher = createCipheriv(aesAlgorithmFor(key.length), key, iv)
  cipher.setAutoPadding(true)
  return Buffer.concat([cipher.update(plain), cipher.final()])
}

/** android.util.Base64.DEFAULT: 76-char lines, each terminated by "\n". */
export function androidBase64Default(data: Buffer): string {
  const b64 = data.toString('base64')
  const lines = b64.match(/.{1,76}/g) ?? ['']
  return `${lines.join('\n')}\n`
}

/** android.util.Base64.NO_WRAP */
export function base64NoWrap(data: Buffer | string): string {
  return (typeof data === 'string' ? Buffer.from(data, 'utf8') : data).toString('base64')
}

/**
 * Encrypt the login password the way the app does when `pwdAESCphd` is "Y":
 * AES-CBC(key = UTF-8 bytes of the server key, iv = first 16 chars, PKCS#7)
 * → Base64 DEFAULT (with the trailing newline) → Base64 NO_WRAP.
 */
export function encryptPassword(password: string, key: string): string {
  const keyBytes = Buffer.from(key, 'utf8')
  const iv = Buffer.from(key.slice(0, 16), 'utf8')
  const encrypted = aesCbcEncrypt(Buffer.from(password, 'utf8'), keyBytes, iv)
  return base64NoWrap(androidBase64Default(encrypted))
}

export interface LoginCryptoInfo {
  idx: string
  key: string
  /** pwdAESCphd flag: true → AES path, false → plain Base64 */
  aes: boolean
}

/** S4/C0812l.getAmountEncrypt: AES + double Base64, or plain Base64 NO_WRAP when the server says "N". */
export function transformLoginPassword(password: string, info: LoginCryptoInfo): string {
  if (!info.aes) return base64NoWrap(password)
  return encryptPassword(password, info.key)
}

/** S4/C0812l.getSid: AES-CBC("AD" + epoch ms) with a fixed key (= IV) → Base64 DEFAULT. */
export function generateSid(timestampMs: number, device = 'AD', sidKey = SID_KEY): string {
  const key = Buffer.from(sidKey, 'utf8')
  return androidBase64Default(aesCbcEncrypt(Buffer.from(`${device}${timestampMs}`, 'utf8'), key, key))
}
