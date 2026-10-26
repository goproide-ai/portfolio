import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, SettingsStore } from '../src/main/store/settings'

const dirs: string[] = []
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), 'korail-settings-'))
  dirs.push(d)
  return d
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('SettingsStore', () => {
  it('starts from the defaults, with no version override', () => {
    const store = new SettingsStore(tmp())
    expect(store.get()).toEqual(DEFAULT_SETTINGS)
    expect(store.get().appVersion).toBe('')
    expect(store.get().appDisplayVersion).toBe('')
  })

  it('keeps only well-formed version overrides and persists them', () => {
    const dir = tmp()
    const store = new SettingsStore(dir)
    expect(store.save({ appVersion: '250722002', appDisplayVersion: '7.0.11' })).toMatchObject({ appVersion: '250722002', appDisplayVersion: '7.0.11' })
    expect(JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))).toMatchObject({ appVersion: '250722002', appDisplayVersion: '7.0.11' })
    expect(new SettingsStore(dir).get()).toMatchObject({ appVersion: '250722002', appDisplayVersion: '7.0.11' })
    // Garbage clears the override instead of being sent to Korail.
    expect(store.save({ appVersion: 'latest', appDisplayVersion: 'v7' })).toMatchObject({ appVersion: '', appDisplayVersion: '' })
    // Unrelated patches leave the overrides alone.
    store.save({ appDisplayVersion: '7.0.12' })
    expect(store.save({ intervalMs: 5000 }).appDisplayVersion).toBe('7.0.12')
  })
})
