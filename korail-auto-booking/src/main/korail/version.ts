/**
 * Runtime selection of the two app-version values Korail gates on (`Version` build number and
 * `AppVersion` store version). Korail bumps them with every 코레일+ release and rejects stale
 * ones with "앱 업데이트 후 이용해 주세요", so the built-in defaults can be overridden without a
 * rebuild — by the user in the settings UI, by an environment variable, or by a small JSON
 * document fetched from this project's repository at startup.
 */

export type VersionSource = 'setting' | 'env' | 'hint' | 'server' | 'default'

export interface VersionCandidates {
  /** Value the user typed into the settings UI ('' = none). */
  setting?: string
  /** KORAIL_APP_VERSION / KORAIL_APP_DISPLAY_VERSION. */
  env?: string
  /** Value from the remote korail-version.json. */
  hint?: string
  /** Latest store version Korail's own main-screen cache announces (NEWDVERSION). */
  server?: string
}

export interface ResolvedVersion {
  value: string
  source: VersionSource
}

/** `Version`: a numeric build number such as 250722001 (9 digits so far; accept a little slack). */
export const BUILD_VERSION_REGEX = /^\d{6,12}$/
/** `AppVersion`: a dotted store version such as 7.0.10. */
export const DISPLAY_VERSION_REGEX = /^\d{1,3}(\.\d{1,4}){1,3}$/

export function normalizeBuildVersion(raw: unknown): string {
  const v = typeof raw === 'string' ? raw.trim() : ''
  return BUILD_VERSION_REGEX.test(v) ? v : ''
}

export function normalizeDisplayVersion(raw: unknown): string {
  const v = typeof raw === 'string' ? raw.trim() : ''
  return DISPLAY_VERSION_REGEX.test(v) ? v : ''
}

/**
 * Order two version strings numerically per dotted component ("7.0.10" > "7.0.9", "250722001" > "250601003").
 * Returns <0, 0, >0 like a comparator.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

/**
 * Precedence: user setting > environment variable > the newer of the remote hint and Korail's own
 * announcement > built-in default. A discovered value older than the built-in is ignored: the
 * built-in is what this build was verified against, and Korail only ever raises the bar.
 */
export function resolveVersion(builtIn: string, candidates: VersionCandidates, normalize: (raw: unknown) => string): ResolvedVersion {
  const setting = normalize(candidates.setting)
  if (setting) return { value: setting, source: 'setting' }
  const env = normalize(candidates.env)
  if (env) return { value: env, source: 'env' }
  let best: ResolvedVersion = { value: builtIn, source: 'default' }
  for (const [source, raw] of [
    ['hint', candidates.hint],
    ['server', candidates.server],
  ] as Array<[VersionSource, string | undefined]>) {
    const value = normalize(raw)
    if (value && compareVersions(value, best.value) > 0) best = { value, source }
  }
  return best
}

/** What the app's main-screen cache says about the current store release. */
export interface AppUpdateInfo {
  /** NEWDVERSION, normalised to a dotted store version, or '' when absent / unrecognisable. */
  latestVersion: string
  /** AMESSAGE — the update prompt the app would show. */
  message: string
  /** CNTAURL — store link. */
  storeUrl: string
}

function pick(obj: Record<string, unknown>, name: string): unknown {
  const key = Object.keys(obj).find((k) => k.toLowerCase() === name.toLowerCase())
  return key === undefined ? undefined : obj[key]
}

/** Parse the prdMobilePlusMain.cache JSON: `{ version: { NEWDVERSION, AMESSAGE, CNTAURL }, notice: … }`. */
export function parseAppUpdateInfo(json: unknown): AppUpdateInfo {
  const empty: AppUpdateInfo = { latestVersion: '', message: '', storeUrl: '' }
  if (!json || typeof json !== 'object') return empty
  const version = pick(json as Record<string, unknown>, 'version')
  if (!version || typeof version !== 'object' || Array.isArray(version)) return empty
  const v = version as Record<string, unknown>
  const text = (x: unknown): string => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim() : '')
  return {
    latestVersion: normalizeDisplayVersion(text(pick(v, 'NEWDVERSION'))),
    message: text(pick(v, 'AMESSAGE')),
    storeUrl: text(pick(v, 'CNTAURL')),
  }
}

/** Both effective values, as applied to the client. */
export interface ResolvedVersions {
  version: ResolvedVersion
  appVersion: ResolvedVersion
}

export interface VersionHint {
  version?: string
  appVersion?: string
  /** Latest store version announced by Korail's own main-screen cache (not part of korail-version.json). */
  server?: string
}

/** Parse korail-version.json; returns null unless at least one usable value is present. */
export function parseVersionHint(text: string): VersionHint | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>
  const hint: VersionHint = {}
  const version = normalizeBuildVersion(obj.version)
  const appVersion = normalizeDisplayVersion(obj.appVersion)
  if (version) hint.version = version
  if (appVersion) hint.appVersion = appVersion
  return hint.version || hint.appVersion ? hint : null
}

export type HintFetch = (input: string, init?: RequestInit) => Promise<Response>

/**
 * Fetch the first URL that yields a valid hint. Failures are swallowed (logged) — the hint is
 * an optimisation, never a requirement, and the app must start offline.
 */
export async function fetchVersionHint(
  fetchImpl: HintFetch,
  urls: readonly string[],
  { timeoutMs = 5_000, log = () => undefined }: { timeoutMs?: number; log?: (message: string) => void } = {},
): Promise<VersionHint | null> {
  for (const url of urls) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(url, { method: 'GET', signal: controller.signal, redirect: 'follow', cache: 'no-store' })
      if (!res.ok) {
        log(`version hint ${url}: HTTP ${res.status}`)
        continue
      }
      const hint = parseVersionHint(await res.text())
      if (hint) return hint
      log(`version hint ${url}: no usable values`)
    } catch (e) {
      log(`version hint ${url}: ${(e as Error)?.message ?? String(e)}`)
    } finally {
      clearTimeout(timer)
    }
  }
  return null
}
