import { describe, expect, it } from 'vitest'
import {
  DYNAPATH_LOGIN_PATH,
  DYNAPATH_LOGIN_TOKEN_LENGTH,
  DYNAPATH_TOKEN_LENGTH,
  DYNAPATH_TOKEN_PREFIX,
  DynapathTokenGenerator,
  generateToken,
  isRequestBoundPath,
  looksLikeDynapathToken,
  randomAlphanumeric,
} from '../src/main/korail/dynapath'

const ALNUM = /^[0-9A-Za-z]+$/

describe('DynaPath 2.0.1 token', () => {
  it('starts with the 201 version prefix and uses only [0-9A-Za-z]', () => {
    const token = generateToken()
    expect(token.startsWith(DYNAPATH_TOKEN_PREFIX)).toBe(true)
    expect(token).toMatch(ALNUM)
    expect(looksLikeDynapathToken(token)).toBe(true)
  })

  it('has the observed lengths: 222 on protected requests, 324 on the request-bound login', () => {
    expect(generateToken(false)).toHaveLength(DYNAPATH_TOKEN_LENGTH)
    expect(generateToken(true)).toHaveLength(DYNAPATH_LOGIN_TOKEN_LENGTH)
    expect(DYNAPATH_TOKEN_LENGTH).toBe(222)
    expect(DYNAPATH_LOGIN_TOKEN_LENGTH).toBe(324)
  })

  it('is fresh on every call', () => {
    const seen = new Set(Array.from({ length: 20 }, () => generateToken()))
    expect(seen.size).toBe(20)
  })

  it('binds only login.Login', () => {
    expect(isRequestBoundPath(DYNAPATH_LOGIN_PATH)).toBe(true)
    expect(isRequestBoundPath('/classes/com.korail.mobile.seatMovie.ScheduleView')).toBe(false)
    const gen = new DynapathTokenGenerator()
    expect(gen.token(DYNAPATH_LOGIN_PATH)).toHaveLength(324)
    expect(gen.token('/classes/com.korail.mobile.certification.TicketReservation')).toHaveLength(222)
  })

  it('rejects the old SDK 1.x shape and non-alphanumeric bodies', () => {
    expect(looksLikeDynapathToken('bEeEPLYj144a44lD')).toBe(false)
    expect(looksLikeDynapathToken('201abc-def')).toBe(false)
    expect(looksLikeDynapathToken('201')).toBe(true)
  })

  it('draws uniformly sized random bodies and honours an injected source', () => {
    expect(randomAlphanumeric(0)).toBe('')
    expect(randomAlphanumeric(500)).toMatch(ALNUM)
    expect(randomAlphanumeric(500)).toHaveLength(500)
    expect(() => randomAlphanumeric(-1)).toThrow(RangeError)
    const fixed = new DynapathTokenGenerator((n) => 'x'.repeat(n))
    expect(fixed.token('/classes/com.korail.mobile.seatMovie.ScheduleView')).toBe(`201${'x'.repeat(219)}`)
  })
})
