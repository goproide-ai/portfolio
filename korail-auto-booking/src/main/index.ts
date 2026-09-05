import { BrowserWindow, app, safeStorage, shell } from 'electron'
import { join } from 'node:path'
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
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:') && !url.startsWith(process.env.ELECTRON_RENDERER_URL ?? 'about:blank')) {
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
