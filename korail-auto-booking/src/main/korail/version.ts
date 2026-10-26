/**
 * Runtime selection of the two app-version values Korail gates on (`Version` build number and
 * `AppVersion` store version). Korail bumps them with every 코레일+ release and rejects stale
 * ones with "앱 업데이트 후 이용해 주세요", so the built-in defaults can be overridden without a
 * rebuild — by the user in the settings UI, by an environment variable, or by a small JSON
 * document fetched from this project's repository at startup.
 */

export type VersionSource = 'setting' | 'env' | 'hint' | 'default'

export interface VersionCandidates {
  /** Value the user typed into the settings UI ('' = none). */
  setting?: string
  /** KORAIL_APP_VERSION / KORAIL_APP_DISPLAY_VERSION. */
  env?: string
  /** Value from the remote korail-version.json. */
  hint?: string
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

/** Precedence: user setting > environment variable > remote hint > built-in default. */
export function resolveVersion(builtIn: string, candidates: VersionCandidates, normalize: (raw: unknown) => string): ResolvedVersion {
  const setting = normalize(candidates.setting)
  if (setting) return { value: setting, source: 'setting' }
  const env = normalize(candidates.env)
  if (env) return { value: env, source: 'env' }
  const hint = normalize(candidates.hint)
  if (hint) return { value: hint, source: 'hint' }
  return { value: builtIn, source: 'default' }
}

/** Both effective values, as applied to the client. */
export interface ResolvedVersions {
  version: ResolvedVersion
  appVersion: ResolvedVersion
}

export interface VersionHint {
  version?: string
  appVersion?: string
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
