import { describe, expect, it } from 'vitest'
import { compareVersions, fetchVersionHint, normalizeBuildVersion, normalizeDisplayVersion, parseAppUpdateInfo, parseVersionHint, resolveVersion } from '../src/main/korail/version'

describe('version values', () => {
  it('normalises the two shapes Korail uses', () => {
    expect(normalizeBuildVersion(' 250722001 ')).toBe('250722001')
    expect(normalizeBuildVersion('7.0.10')).toBe('')
    expect(normalizeBuildVersion(250722001)).toBe('')
    expect(normalizeDisplayVersion('7.0.10')).toBe('7.0.10')
    expect(normalizeDisplayVersion('7.1')).toBe('7.1')
    expect(normalizeDisplayVersion('v7.0.10')).toBe('')
    expect(normalizeDisplayVersion('250722001')).toBe('')
  })

  it('prefers the user setting, then the environment, then the remote hint, then the default', () => {
    const n = normalizeDisplayVersion
    expect(resolveVersion('7.0.10', { setting: '7.0.12', env: '7.0.11', hint: '7.0.13' }, n)).toEqual({ value: '7.0.12', source: 'setting' })
    expect(resolveVersion('7.0.10', { setting: '', env: '7.0.11', hint: '7.0.13' }, n)).toEqual({ value: '7.0.11', source: 'env' })
    expect(resolveVersion('7.0.10', { setting: 'garbage', env: undefined, hint: '7.0.13' }, n)).toEqual({ value: '7.0.13', source: 'hint' })
    expect(resolveVersion('7.0.10', {}, n)).toEqual({ value: '7.0.10', source: 'default' })
  })

  it("takes the newer of the remote hint and Korail's own announcement, never an older one", () => {
    const n = normalizeDisplayVersion
    expect(resolveVersion('7.0.10', { hint: '7.0.11', server: '7.0.12' }, n)).toEqual({ value: '7.0.12', source: 'server' })
    expect(resolveVersion('7.0.10', { hint: '7.1.0', server: '7.0.12' }, n)).toEqual({ value: '7.1.0', source: 'hint' })
    expect(resolveVersion('7.0.10', { server: '7.0.9' }, n)).toEqual({ value: '7.0.10', source: 'default' })
    expect(resolveVersion('7.0.10', { hint: '7.0.10' }, n)).toEqual({ value: '7.0.10', source: 'default' })
    // A user setting still wins even when it is older — it is an explicit instruction.
    expect(resolveVersion('7.0.10', { setting: '7.0.9', server: '7.0.12' }, n)).toEqual({ value: '7.0.9', source: 'setting' })
    expect(resolveVersion('250722001', { hint: '250601003' }, normalizeBuildVersion)).toEqual({ value: '250722001', source: 'default' })
    expect(resolveVersion('250722001', { hint: '250901001' }, normalizeBuildVersion)).toEqual({ value: '250901001', source: 'hint' })
  })

  it('compares dotted versions numerically', () => {
    expect(compareVersions('7.0.10', '7.0.9')).toBeGreaterThan(0)
    expect(compareVersions('7.0.10', '7.0.10')).toBe(0)
    expect(compareVersions('7.1', '7.0.10')).toBeGreaterThan(0)
    expect(compareVersions('6.5.0', '7.0.10')).toBeLessThan(0)
    expect(compareVersions('250722001', '250601003')).toBeGreaterThan(0)
  })

  it("parses the app's main-screen cache (NEWDVERSION / AMESSAGE / CNTAURL) defensively", () => {
    expect(parseAppUpdateInfo({ version: { NEWDVERSION: '7.0.11', AMESSAGE: ' 최신 버전으로  업데이트해 주세요. ', CNTAURL: 'https://play.google.com/x' }, notice: {} })).toEqual({
      latestVersion: '7.0.11',
      message: '최신 버전으로 업데이트해 주세요.',
      storeUrl: 'https://play.google.com/x',
    })
    expect(parseAppUpdateInfo({ version: { newdversion: '7.0.12' } }).latestVersion).toBe('7.0.12')
    expect(parseAppUpdateInfo({ version: { NEWDVERSION: '9' } }).latestVersion).toBe('')
    expect(parseAppUpdateInfo({ version: { NEWDVERSION: '<b>7.0.11</b>' } }).latestVersion).toBe('')
    expect(parseAppUpdateInfo({ version: [] }).latestVersion).toBe('')
    expect(parseAppUpdateInfo({ strResult: 'FAIL' })).toEqual({ latestVersion: '', message: '', storeUrl: '' })
    expect(parseAppUpdateInfo(null).latestVersion).toBe('')
  })

  it('parses only well-formed hints', () => {
    expect(parseVersionHint('{"version":"250722001","appVersion":"7.0.10","updatedAt":"2026-10-26"}')).toEqual({ version: '250722001', appVersion: '7.0.10' })
    expect(parseVersionHint('{"appVersion":"7.0.11"}')).toEqual({ appVersion: '7.0.11' })
    expect(parseVersionHint('{"version":"abc","appVersion":"<script>"}')).toBeNull()
    expect(parseVersionHint('not json')).toBeNull()
    expect(parseVersionHint('[]')).toBeNull()
  })

  it('fetches the first URL that yields a usable hint and never throws', async () => {
    const calls: string[] = []
    const fetchImpl = async (url: string): Promise<Response> => {
      calls.push(url)
      if (url.endsWith('/one')) return new Response('nope', { status: 404 })
      if (url.endsWith('/two')) throw new Error('net::ERR_INTERNET_DISCONNECTED')
      return new Response(JSON.stringify({ appVersion: '7.0.11' }))
    }
    const log: string[] = []
    expect(await fetchVersionHint(fetchImpl, ['https://x/one', 'https://x/two', 'https://x/three'], { log: (m) => log.push(m) })).toEqual({ appVersion: '7.0.11' })
    expect(calls).toHaveLength(3)
    expect(log.join('\n')).toMatch(/HTTP 404/)
    expect(log.join('\n')).toMatch(/ERR_INTERNET_DISCONNECTED/)
    expect(await fetchVersionHint(fetchImpl, ['https://x/one'])).toBeNull()
  })
})
