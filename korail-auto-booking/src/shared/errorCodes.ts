/**
 * Error codes that travel from the main process to the renderer inside the error message
 * (IPC errors are flattened to `message [CODE]` by describeError). Shared so the UI can
 * recognise the few failures it reacts to specially.
 */

/** Korail demanded an app update: the Version / AppVersion values this build sends are stale. */
export const APP_VERSION_ERROR_CODE = 'APP_VERSION'

/** True when a flattened error message carries the app-version code. */
export function isAppVersionErrorMessage(message: string | null | undefined): boolean {
  return typeof message === 'string' && message.includes(`[${APP_VERSION_ERROR_CODE}]`)
}
