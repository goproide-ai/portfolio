/**
 * Error codes that travel from the main process to the renderer inside the error message
 * (IPC errors are flattened to `message [CODE]` by describeError). Shared so the UI can
 * recognise the few failures it reacts to specially.
 */

/** Korail demanded an app update: the Version / AppVersion values this build sends are stale. */
export const APP_VERSION_ERROR_CODE = 'APP_VERSION'

/**
 * Codes Korail itself uses for that demand: -8204 is what the server has answered since 2026-10-21
 * ("최신 버전으로 업데이트해 주세요"), SUPDATE is the app's own literal for the same class.
 */
export const APP_VERSION_SERVER_CODES: readonly string[] = ['-8204', 'SUPDATE']

/**
 * True when a flattened error message (`message [CODE]`) carries the app-version code. The server
 * codes are accepted too so the UI reacts even if a message was flattened with the raw code.
 */
export function isAppVersionErrorMessage(message: string | null | undefined): boolean {
  if (typeof message !== 'string') return false
  return [APP_VERSION_ERROR_CODE, ...APP_VERSION_SERVER_CODES].some((code) => message.includes(`[${code}]`))
}
