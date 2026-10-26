import { describe, expect, it } from 'vitest'
import { fetchVersionHint, normalizeBuildVersion, normalizeDisplayVersion, parseVersionHint, resolveVersion } from '../src/main/korail/version'

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
