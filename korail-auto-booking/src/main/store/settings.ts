import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { AppSettings } from '../../shared/types'
import { DEFAULT_INTERVAL_MS, DEFAULT_JITTER_MS } from '../booking/engine'

export const DEFAULT_SETTINGS: AppSettings = {
  lastSearch: null,
  seatPreference: 'GENERAL_FIRST',
  allowWaitingList: false,
  continueAfterWaitlist: true,
  waitlistSmsPhone: '',
  intervalMs: DEFAULT_INTERVAL_MS,
  jitterMs: DEFAULT_JITTER_MS,
  maxAttempts: 0,
  soundOnSuccess: true,
  notifyOnSuccess: true,
}

/** Tiny JSON-file settings store kept in Electron's userData directory. */
export class SettingsStore {
  private readonly file: string
  private cache: AppSettings | null = null

  constructor(userDataDir: string) {
    this.file = join(userDataDir, 'settings.json')
  }

  get(): AppSettings {
    if (this.cache) return { ...this.cache }
    let parsed: Partial<AppSettings> = {}
    try {
      parsed = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<AppSettings>
    } catch {
      parsed = {}
    }
    this.cache = { ...DEFAULT_SETTINGS, ...sanitize(parsed) }
    return { ...this.cache }
  }

  save(patch: Partial<AppSettings>): AppSettings {
    const next = { ...this.get(), ...sanitize(patch) }
    this.cache = next
    try {
      mkdirSync(dirname(this.file), { recursive: true })
      writeFileSync(this.file, JSON.stringify(next, null, 2), 'utf8')
    } catch {
      // Settings are a convenience; never fail the caller because the disk is read-only.
    }
    return { ...next }
  }
}

function sanitize(input: Partial<AppSettings>): Partial<AppSettings> {
  const out: Partial<AppSettings> = {}
  if (input.lastSearch && typeof input.lastSearch === 'object') out.lastSearch = input.lastSearch
  if (input.lastSearch === null) out.lastSearch = null
  if (typeof input.seatPreference === 'string') out.seatPreference = input.seatPreference
  if (typeof input.allowWaitingList === 'boolean') out.allowWaitingList = input.allowWaitingList
  if (typeof input.continueAfterWaitlist === 'boolean') out.continueAfterWaitlist = input.continueAfterWaitlist
  if (typeof input.waitlistSmsPhone === 'string') out.waitlistSmsPhone = input.waitlistSmsPhone.replace(/[^\d-]/g, '').slice(0, 13)
  if (Number.isFinite(input.intervalMs)) out.intervalMs = Math.max(1000, Math.floor(input.intervalMs as number))
  if (Number.isFinite(input.jitterMs)) out.jitterMs = Math.max(0, Math.floor(input.jitterMs as number))
  if (Number.isFinite(input.maxAttempts)) out.maxAttempts = Math.max(0, Math.floor(input.maxAttempts as number))
  if (typeof input.soundOnSuccess === 'boolean') out.soundOnSuccess = input.soundOnSuccess
  if (typeof input.notifyOnSuccess === 'boolean') out.notifyOnSuccess = input.notifyOnSuccess
  return out
}
