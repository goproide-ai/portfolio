import { describe, expect, it } from 'vitest'
import {
  DYNAPATH_ENCODING_TABLE,
  buildDefaultSettings,
  buildPrefix,
  encodeNormalBe,
  generateEncodingTable,
  generateToken,
  javaUrlEncode,
  makeDynapathKey,
  makeEncodeTable,
  stringToXa1s,
} from '../src/main/korail/dynapath'

// Reference values produced with yakisoba0728/korail-mobile-api dynapath.py (Apache-2.0).
const TABLE1 = '3FE9jgRD4KdCyuawklqGJYmvfMn15P7US8XbxeLQtWT6OicBAopINs2Vh0HZrz'
const SETTINGS = buildDefaultSettings({ osVersion: '15', deviceModel: 'Android', appStartTs: 1757000000000, deviceId: '558a4f02041657ea' })
const VECTORS = [
  {
    ts: 1757000123456,
    rand: 'aB3z',
    token:
      'bEeEPLYj144a44lDf3CM1Yng4ffKk44GR4GDK3FKdMFf9a4YjquGvCvKuGk9a4uY3qw1uKDngCJwMdMnvm1d5aCuCCuvCE1dMCJDCngDqunnqvYwgvmlJd4djf9E9dDK913Jjj95KJmyv4nCGl95f9lkdMR9EJJmCdMyng1qGlJvuuKKJmd9GlJaEJvuuKKJmdJDqqGlJvuuKKJmdJyyYj19aDqqMngKqE9CEEdMCCunCunCunCunCJPqPYvGjdPldP1CunCEudDKdMfngFqE9CJPuGMvGjdkyJjdvGMu1qqkkJPwng1qE9YFkJjauGn9glqymYRdCEkCu3Ry',
  },
  {
    ts: 1757000999999,
    rand: '0000',
    token:
      'bEeEPLYj144a44lDmC4GR4GF4ffKk44GR4GwdDfdDfF1yMjdlnK5JwJRK5fyMjKdPnu3KRqg4wGuCaCgJ13aEMwKwwKJw93aCwGqwg4qnKggnJdu4J1vGajalYy9yaqRy3PGllyERG1mJjgw5vyEYyvfaCFy9GG1waCmg43n5vGJKKRRG1ay5vGM9GJKKRRG1aGqnn5vGJKKRRG1aGmmdl3yMqnnCg4Rn9yw99aCwwKgwKgwKgwKgwGDnDdJ5laDvaD3wKgJY9JY9JY9g4kn9ywGDK5CJ5lafmGlaJ5CK3nnffGDug43n9ydkfGlMK5gy4vnm1dFaw9fwKPFm',
  },
  {
    ts: 1700000000000,
    rand: 'ZzZz',
    token:
      'bEeEPLYj144a44lDvvY1mYng4ff4GR4GR4GR4GR4GRFq9mg3flPvq1qMPvY9mgP3ulKJPMERw14KDdDRqCJdym1P11Pq1GJdD14E1RwElPRRlq3KwqCF4dgdf59G9dEM9Ju4ff9yM4CnqgR1vF9y59FYdDj9G44C1dDnRwJlvF4qPPMM4Cd9vF4mG4qPPMM4Cd4EllvF4qPPMM4Cd4nn3fJ9mEllDRwMlG91GGdD11PR1PR1PR1PR14klk3qvfdkJ1PR1PR1PR1PR1PRRwalG914kPvDqvfdYn4fdqvDPJllYY4kKRwJlG93aY4fmPvR9wFlnC3jd1GY1Pujn',
  },
]

describe('DynaPath token', () => {
  it('derives the SDK encoding table for index 1', () => {
    expect(generateEncodingTable(1)).toBe(TABLE1)
    expect(DYNAPATH_ENCODING_TABLE).toBe(TABLE1)
    expect(buildPrefix(TABLE1)).toBe('bEeEP')
  })

  it('matches the reference encoding primitives', () => {
    const key = 'v1.0.3+aB3z+1757000123456'
    expect(encodeNormalBe(key, TABLE1)).toBe('Yj144a44lDf3CM1Yng4ffKk44GR4GDK3FKdMFf')
    expect(makeDynapathKey(key)).toBe(21190532279180906493045312640658870471937183094n)
    expect(makeEncodeTable(makeDynapathKey(key), 30, TABLE1)).toBe('jR4m3DnfCdvY5KakM9JuqyF1EwPglG')
    expect(stringToXa1s('ab')).toEqual([97, 98])
    expect(stringToXa1s('한')).toEqual([((0xd55c >> 14) & 15) | 144, (0xd55c >> 7) & 127, 0xd55c & 127])
  })

  it('url-encodes like java.net.URLEncoder', () => {
    expect(javaUrlEncode('[38ff]')).toBe('%5B38ff%5D')
    expect(javaUrlEncode('SM-S928N Build/X')).toBe('SM-S928N+Build%2FX')
    expect(javaUrlEncode("a~b'c*d._-")).toBe("a%7Eb%27c*d._-")
  })

  it.each(VECTORS)('reproduces the reference token for ts=$ts rand=$rand', ({ ts, rand, token }) => {
    expect(generateToken(SETTINGS, ts, rand)).toBe(token)
  })

  it('reproduces the reference token for the dhfhfk-style settings (sv=v1, SM-S928N)', () => {
    const s = { ...buildDefaultSettings({ osVersion: '13', deviceModel: 'SM-S928N', appStartTs: 1, deviceId: '0123456789abcdef' }), sdkVersion: 'v1' }
    expect(generateToken(s, 1757000123456, 'AB12')).toBe(
      'bEeEPSYj1Dm5CMM4Pv4ffKk44GR4GDK3FKdMFffqFYdgPGC9CuPGvfqFPYJgkwPul519akn9PE3dK3Ck3MPCFufukfmPalu51lgP55gCYk1Cy4a3F3dEfmf3lufwJaddfjuayMCF59G4fjEf4v3nKfmaay93nM51wgG4aCPPuuay3fG4aqmaCPPuuay3alggG4aCPPuuay3aMMYdwfqlggn51ugmf9mEgDYCGd3D43Dw9P59mP3lu3nE51Rgmf9aDPGnCGd3JGad3YdJumRq1C3d5uGDgMKCGnPwggvvaDk51wMl3MJ1',
    )
  })

  it('creates fresh device ids and nonces', () => {
    const a = buildDefaultSettings({ osVersion: '15', deviceModel: 'Android' })
    const b = buildDefaultSettings({ osVersion: '15', deviceModel: 'Android' })
    expect(a.deviceId).toMatch(/^[0-9a-f]{16}$/)
    expect(a.deviceId).not.toBe(b.deviceId)
    const t1 = generateToken(a)
    const t2 = generateToken(a)
    expect(t1.startsWith('bEeEP')).toBe(true)
    expect(t1).not.toBe(t2)
  })
})
