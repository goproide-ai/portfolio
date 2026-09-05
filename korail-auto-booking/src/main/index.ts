import { BrowserWindow, app, safeStorage, session, shell } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { BookingEngine } from './booking/engine'
import { broadcast, registerIpc, type IpcContext } from './ipc'
import { KorailClient } from './korail/client'
import { endpointsFor } from './korail/constants'
import { notifyReservation } from './notify'
import { CredentialStore } from './store/credentials'
import { SettingsStore } from './store/settings'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 840,
    minWidth: 980,
    minHeight: 660,
    title: '코레일 자동예매',
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

function bootstrap(): void {
  const userData = app.getPath('userData')
  // Allow pointing the client at another host (tests, or if Korail moves the API).
  const apiBase = process.env.KORAIL_API_BASE
  const settings = new SettingsStore(userData)
  const credentials = new CredentialStore(userData, safeStorage)
  const client = new KorailClient({
    endpoints: apiBase ? endpointsFor(apiBase) : undefined,
    logger: isDev || process.env.KORAIL_DEBUG ? (m) => console.log(`[korail] ${m}`) : undefined,
  })
  const session: IpcContext['session'] = { credentials: null }

  const engine = new BookingEngine({
    client,
    relogin: async () => {
      const creds = session.credentials ?? credentials.load()
      if (!creds) return false
      const result = await client.login(creds.id, creds.password)
      return result.ok
    },
  })

  engine.on('log', (entry) => broadcast('booking:log', entry))
  engine.on('state', (state) => broadcast('booking:state', state))
  engine.on('success', (reservation) => {
    if (settings.get().notifyOnSuccess) notifyReservation(reservation, mainWindow)
  })

  registerIpc({ client, engine, settings, credentials, session })

  app.on('before-quit', () => {
    engine.stop()
  })
}

// Isolated profile for automated tests.
if (process.env.KORAIL_USER_DATA) app.setPath('userData', process.env.KORAIL_USER_DATA)

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    app.setAppUserModelId('dev.goproide.korail-auto-booking')
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
