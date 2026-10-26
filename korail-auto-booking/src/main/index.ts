import { BrowserWindow, Menu, app, dialog, nativeTheme, net, powerSaveBlocker, safeStorage, session, shell } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { BookingEngine } from './booking/engine'
import { broadcast, registerIpc, type IpcContext } from './ipc'
import { KorailClient, type FetchLike } from './korail/client'
import { API_VERSION, APP_DISPLAY_VERSION, VERSION_HINT_URLS, endpointsFor } from './korail/constants'
import { fetchVersionHint, normalizeBuildVersion, normalizeDisplayVersion, resolveVersion, type ResolvedVersions, type VersionHint } from './korail/version'
import { notifyReservation, notifyStopped } from './notify'
import { CredentialStore } from './store/credentials'
import { SettingsStore } from './store/settings'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let engine: BookingEngine | null = null
/** Set once the user confirmed quitting (or nothing was running), so window 'close' does not ask again. */
let quitting = false

/** Windows and macOS take the window icon from the exe / bundle; Linux needs an explicit file. */
function windowIcon(): string | undefined {
  if (process.platform !== 'linux') return undefined
  const candidates = [join(process.resourcesPath, 'icon.png'), join(__dirname, '../../resources/icon.png')]
  return candidates.find((p) => existsSync(p))
}

/** Ask before abandoning a running booking. Returns true when it is fine to stop and proceed. */
function confirmStopRunning(win: BrowserWindow | null): boolean {
  if (!engine?.running) return true
  const options = {
    type: 'warning' as const,
    buttons: ['계속 실행', '중지하고 닫기'],
    defaultId: 0,
    cancelId: 0,
    title: '자동 예매 실행 중',
    message: '자동 예매가 실행 중입니다.',
    detail: '창을 닫으면 자동 예매가 중지됩니다. 계속 실행하려면 창을 최소화하세요.',
  }
  const choice = win && !win.isDestroyed() ? dialog.showMessageBoxSync(win, options) : dialog.showMessageBoxSync(options)
  if (choice !== 1) return false
  engine.stop()
  return true
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 840,
    minWidth: 980,
    minHeight: 660,
    title: '코레일 자동예매',
    icon: windowIcon(),
    autoHideMenuBar: true,
    backgroundColor: '#f5f7fb',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  win.once('ready-to-show', () => win.show())
  win.on('close', (event) => {
    if (quitting) return
    if (!confirmStopRunning(win)) event.preventDefault()
  })
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  // Any link that tries to open a new window goes to the OS browser instead.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  // Only the app's own renderer may load in this privileged window (it carries the preload bridge).
  // Compare by origin (dev) or exact file URL (prod) — never allow the bare file: scheme, which would
  // let any local HTML file inherit the bridge.
  const rendererFileUrl = pathToFileURL(join(__dirname, '../renderer/index.html')).href
  win.webContents.on('will-navigate', (event, url) => {
    let allowed = false
    try {
      if (isDev && process.env.ELECTRON_RENDERER_URL) {
        allowed = new URL(url).origin === new URL(process.env.ELECTRON_RENDERER_URL).origin
      } else {
        allowed = url.split('#')[0] === rendererFileUrl
      }
    } catch {
      allowed = false
    }
    if (!allowed) {
      event.preventDefault()
      if (/^https?:/i.test(url)) void shell.openExternal(url)
    }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

/** Bring the app window back (notification click, dock click, second instance), creating it if needed. */
function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

/**
 * The released app gets a minimal menu: macOS keeps the app/edit/window roles (Cmd+Q, Cmd+C/V only
 * work through menu roles there); Windows and Linux get none, which also drops Electron's default
 * Reload / Force Reload / DevTools / Close accelerators that would kill a running booking.
 */
function installMenu(): void {
  if (isDev) return
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]))
  } else {
    Menu.setApplicationMenu(null)
  }
}

/** KORAIL_API_BASE points the client elsewhere (tests / a host move); anything but an http(s) URL is ignored. */
function apiBaseOverride(): string | undefined {
  const raw = process.env.KORAIL_API_BASE
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    if (url.protocol === 'http:' || url.protocol === 'https:') return raw
  } catch {
    // fall through
  }
  console.warn(`[korail] KORAIL_API_BASE 무시: http(s) URL이 아닙니다 (${raw})`)
  return undefined
}

/**
 * URLs of the remote version hint. KORAIL_VERSION_HINT_URL replaces the default list ('off'
 * disables the lookup); with KORAIL_API_BASE pointing at a test server the lookup is skipped so
 * tests never leave the machine.
 */
function versionHintUrls(apiBaseOverridden: boolean): readonly string[] {
  const raw = process.env.KORAIL_VERSION_HINT_URL?.trim()
  if (raw) {
    if (raw.toLowerCase() === 'off') return []
    try {
      const url = new URL(raw)
      if (url.protocol === 'http:' || url.protocol === 'https:') return [raw]
    } catch {
      // fall through
    }
    console.warn(`[korail] KORAIL_VERSION_HINT_URL 무시: http(s) URL이 아닙니다 (${raw})`)
    return []
  }
  return apiBaseOverridden ? [] : VERSION_HINT_URLS
}

function bootstrap(): void {
  const userData = app.getPath('userData')
  const apiBase = apiBaseOverride()
  const settings = new SettingsStore(userData)
  const credentials = new CredentialStore(userData, safeStorage)
  // Chromium's network stack (net.fetch) honours the OS proxy settings and certificate store, which
  // Node's fetch does not — that is the difference between working and "fetch failed" on office PCs.
  // The session cookie is managed by the client itself, so Electron's cookie store is kept out of it.
  const fetchImpl: FetchLike = (input, init) => net.fetch(input, { ...init, credentials: 'omit' })
  const debugLog = isDev || process.env.KORAIL_DEBUG ? (m: string) => console.log(`[korail] ${m}`) : () => undefined
  const client = new KorailClient({
    fetch: fetchImpl,
    endpoints: apiBase ? endpointsFor(apiBase) : undefined,
    logger: isDev || process.env.KORAIL_DEBUG ? debugLog : undefined,
  })
  // Korail bumps the app version values with each 코레일+ release and rejects stale ones. Let users
  // bridge the gap without a rebuild: settings UI > environment variable > remote hint > built-in.
  const versionHint: VersionHint = {}
  const refreshVersions = (): ResolvedVersions => {
    const s = settings.get()
    const resolved: ResolvedVersions = {
      version: resolveVersion(API_VERSION, { setting: s.appVersion, env: process.env.KORAIL_APP_VERSION, hint: versionHint.version }, normalizeBuildVersion),
      appVersion: resolveVersion(
        APP_DISPLAY_VERSION,
        { setting: s.appDisplayVersion, env: process.env.KORAIL_APP_DISPLAY_VERSION, hint: versionHint.appVersion, server: versionHint.server },
        normalizeDisplayVersion,
      ),
    }
    client.version = resolved.version.value
    client.appVersion = resolved.appVersion.value
    return resolved
  }
  refreshVersions()
  const lookupsOff = process.env.KORAIL_VERSION_HINT_URL?.trim().toLowerCase() === 'off'
  const hintUrls = versionHintUrls(apiBase !== undefined)
  if (hintUrls.length > 0) {
    void fetchVersionHint(fetchImpl, hintUrls, { log: debugLog }).then((hint) => {
      if (!hint) return
      Object.assign(versionHint, hint)
      const r = refreshVersions()
      console.log(`[korail] 원격 버전 안내 적용: Version=${r.version.value} (${r.version.source}), AppVersion=${r.appVersion.value} (${r.appVersion.source})`)
    })
  }
  // Korail's own update notice (the app's main-screen cache) names the current store version; a newer
  // value than the built-in is adopted as AppVersion so the first Korail release after this build
  // still works. Best effort: any failure just leaves the other sources in charge.
  if (!lookupsOff) {
    void client
      .fetchAppUpdateInfo()
      .then((info) => {
        if (!info.latestVersion) {
          debugLog('app cache: no NEWDVERSION in the response')
          return
        }
        versionHint.server = info.latestVersion
        const r = refreshVersions()
        debugLog(`app cache: latest store version ${info.latestVersion}; AppVersion now ${r.appVersion.value} (${r.appVersion.source})`)
      })
      .catch((e: unknown) => debugLog(`app cache lookup failed: ${(e as Error)?.message ?? String(e)}`))
  }
  const sessionState: IpcContext['session'] = { credentials: null }

  engine = new BookingEngine({
    client,
    relogin: async () => {
      const creds = sessionState.credentials ?? credentials.load()
      if (!creds) return false
      const result = await client.login(creds.id, creds.password)
      return result.ok
    },
  })

  let blockerId: number | null = null
  let previousStatus = engine.getState().status
  engine.on('log', (entry) => broadcast('booking:log', entry))
  engine.on('state', (state) => {
    broadcast('booking:state', state)
    // Keep the OS from suspending the app (laptop lid, idle sleep) while a run is polling.
    if (state.status === 'running' && blockerId === null) {
      blockerId = powerSaveBlocker.start('prevent-app-suspension')
    } else if (state.status !== 'running' && blockerId !== null) {
      powerSaveBlocker.stop(blockerId)
      blockerId = null
    }
    if (previousStatus === 'running' && state.status === 'error' && state.error) {
      notifyStopped(state.error, mainWindow, showMainWindow)
    }
    previousStatus = state.status
  })
  engine.on('success', (reservation) => {
    if (settings.get().notifyOnSuccess) notifyReservation(reservation, mainWindow, showMainWindow)
  })
  engine.on('waitlisted', (reservation) => {
    if (settings.get().notifyOnSuccess) notifyReservation(reservation, mainWindow, showMainWindow)
  })

  registerIpc({ client, engine, settings, credentials, session: sessionState, versions: { refresh: refreshVersions } })

  app.on('before-quit', (event) => {
    if (quitting) return
    if (!confirmStopRunning(mainWindow)) {
      event.preventDefault()
      return
    }
    quitting = true
    engine?.stop()
  })
}

// Isolated profile for automated tests.
if (process.env.KORAIL_USER_DATA) app.setPath('userData', process.env.KORAIL_USER_DATA)

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())

  app.whenReady().then(() => {
    app.setAppUserModelId('dev.goproide.korail-auto-booking')
    // The UI is designed light-only; keep native chrome (title bar, selects, dialogs) consistent with it.
    nativeTheme.themeSource = 'light'
    installMenu()
    // In dev only, widen connect-src so Vite HMR (ws/http on localhost) works. The packaged app keeps
    // the tight CSP from index.html; this never runs when app.isPackaged.
    if (isDev) {
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const headers = { ...details.responseHeaders }
        for (const k of Object.keys(headers)) {
          if (k.toLowerCase() === 'content-security-policy') delete headers[k]
        }
        headers['Content-Security-Policy'] = [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://localhost:* http://localhost:*; base-uri 'none'; object-src 'none'",
        ]
        callback({ responseHeaders: headers })
      })
    }
    bootstrap()
    mainWindow = createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
