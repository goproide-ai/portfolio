import { createDecipheriv } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { aesAlgorithmFor, aesCbcEncrypt, androidBase64Default, base64NoWrap, encryptPassword, generateSid, transformLoginPassword } from '../src/main/korail/crypto'

/** Reverse encryptPassword: undo double base64, then AES-CBC decrypt. */
function decryptPassword(doubleB64: string, key: string): string {
  const inner = Buffer.from(doubleB64, 'base64').toString('utf8') // Android Base64.DEFAULT text (with newlines)
  const cipherText = Buffer.from(inner, 'base64')
  const keyBytes = Buffer.from(key, 'utf8')
  const d = createDecipheriv(aesAlgorithmFor(keyBytes.length), keyBytes, Buffer.from(key.slice(0, 16), 'utf8'))
  return Buffer.concat([d.update(cipherText), d.final()]).toString('utf8')
}

describe('encryptPassword', () => {
  it('round-trips with a 32 byte key (AES-256-CBC, PKCS7, Android double base64)', () => {
    const key = 'abcdefghijklmnopqrstuvwxyz012345'
    const out = encryptPassword('p@ssw0rd!한글', key)
    expect(out).toMatch(/^[A-Za-z0-9+/=]+$/)
    expect(decryptPassword(out, key)).toBe('p@ssw0rd!한글')
  })

  it('round-trips with a 16 byte key (AES-128-CBC)', () => {
    const key = '0123456789abcdef'
    expect(decryptPassword(encryptPassword('secret', key), key)).toBe('secret')
  })

  it('is deterministic for the same key (fixed IV derived from key)', () => {
    const key = 'abcdefghijklmnopqrstuvwxyz012345'
    expect(encryptPassword('x', key)).toBe(encryptPassword('x', key))
  })

  it('rejects unsupported key lengths', () => {
    expect(() => encryptPassword('x', 'short')).toThrow(/key length|IV/)
  })

  it('the inner layer is Android Base64.DEFAULT of one AES block for a short password', () => {
    const key = 'abcdefghijklmnopqrstuvwxyz012345'
    const inner = Buffer.from(encryptPassword('abc', key), 'base64').toString('utf8')
    expect(inner.endsWith('\n')).toBe(true)
    expect(Buffer.from(inner, 'base64')).toHaveLength(16)
  })
})

describe('transformLoginPassword', () => {
  it('uses AES when pwdAESCphd is Y', () => {
    const key = 'abcdefghijklmnopqrstuvwxyz012345'
    const out = transformLoginPassword('pw', { idx: '1', key, aes: true })
    expect(decryptPassword(out, key)).toBe('pw')
  })
  it('uses plain base64 when pwdAESCphd is N', () => {
    const out = transformLoginPassword('pw', { idx: '', key: '', aes: false })
    expect(Buffer.from(out, 'base64').toString('utf8')).toBe('pw')
  })
})

describe('generateSid', () => {
  it('AES-CBC encrypts "AD"+ts with the fixed key, Android base64', () => {
    // 16-byte key path: aes-128-cbc. Verified against node crypto directly.
    const sid = generateSid(1757000123456, 'AD')
    expect(sid.endsWith('\n')).toBe(true)
    const key = Buffer.from('2485dd54d9deaa36', 'utf8')
    const d = createDecipheriv('aes-128-cbc', key, key)
    const inner = Buffer.from(sid, 'base64')
    expect(Buffer.concat([d.update(inner), d.final()]).toString('utf8')).toBe('AD1757000123456')
  })
})

describe('base64 helpers', () => {
  it('androidBase64Default wraps at 76 chars with a trailing newline', () => {
    const out = androidBase64Default(Buffer.alloc(60, 0x41))
    expect(out.endsWith('\n')).toBe(true)
    for (const line of out.trimEnd().split('\n')) expect(line.length).toBeLessThanOrEqual(76)
    expect(Buffer.from(out.replace(/\n/g, ''), 'base64')).toHaveLength(60)
  })
  it('base64NoWrap has no newlines', () => {
    expect(base64NoWrap('hello')).toBe(Buffer.from('hello').toString('base64'))
    expect(base64NoWrap(Buffer.alloc(100, 1))).not.toContain('\n')
  })
})

/**
 * Known-answer vectors produced with carpedm20/korail2 `__enc_password` (pycryptodome 3.23.0):
 *
 *   key = 'abcdefghijklmnopqrstuvwxyz012345'; pw = 'p@ssw0rd!한글'
 *   cipher = AES.new(key.encode('utf-8'), AES.MODE_CBC, key[:16].encode('utf-8'))
 *   ct = cipher.encrypt(pad(pw.encode('utf-8'), AES.block_size))
 *   ct.hex()                     -> '61181ad2de58b9c949b60b8afc19e7cb'
 *   b64encode(ct)                -> b'YRga0t5YuclJtguK/Bnnyw=='
 *   b64encode(b64encode(ct))     -> b'WVJnYTB0NVl1Y2xKdGd1Sy9Cbm55dz09'   (korail2 / srtgo wire value)
 *
 * The app itself (S4/C0812l.getAmountEncrypt, per the yakisoba0728/korail-mobile-api APK audit) wraps the
 * inner layer with android.util.Base64.DEFAULT, i.e. the same 24 chars followed by "\n", so the outer
 * layer the app sends is 'WVJnYTB0NVl1Y2xKdGd1Sy9Cbm55dz09Cg=='. Both decode to the same ciphertext.
 */
describe('known-answer vectors (pycryptodome / korail2)', () => {
  const key = 'abcdefghijklmnopqrstuvwxyz012345'
  const password = 'p@ssw0rd!한글'

  it('AES-256-CBC/PKCS7 ciphertext matches pycryptodome byte for byte (key = full UTF-8 key, iv = key[:16])', () => {
    const ct = aesCbcEncrypt(Buffer.from(password, 'utf8'), Buffer.from(key, 'utf8'), Buffer.from(key.slice(0, 16), 'utf8'))
    expect(ct.toString('hex')).toBe('61181ad2de58b9c949b60b8afc19e7cb')
  })

  it('inner layer is korail2 b64encode(ciphertext) plus the Android Base64.DEFAULT newline', () => {
    const inner = Buffer.from(encryptPassword(password, key), 'base64').toString('utf8')
    expect(inner).toBe('YRga0t5YuclJtguK/Bnnyw==\n')
  })

  it('outer layer is the APK form; the korail2 form is the same value without the inner newline', () => {
    expect(encryptPassword(password, key)).toBe('WVJnYTB0NVl1Y2xKdGd1Sy9Cbm55dz09Cg==')
    expect(base64NoWrap('YRga0t5YuclJtguK/Bnnyw==')).toBe('WVJnYTB0NVl1Y2xKdGd1Sy9Cbm55dz09')
  })

  it('16-byte key (AES-128-CBC) vector: key 0123456789abcdef, password "secret"', () => {
    const out = encryptPassword('secret', '0123456789abcdef')
    expect(Buffer.from(out, 'base64').toString('utf8')).toBe('MI7tW+ZiM630s7engBaaTg==\n')
    expect(out).toBe('TUk3dFcrWmlNNjMwczdlbmdCYWFUZz09Cg==')
    expect(base64NoWrap('MI7tW+ZiM630s7engBaaTg==')).toBe('TUk3dFcrWmlNNjMwczdlbmdCYWFUZz09')
  })
})
