import { BrowserWindow, app, ipcMain, shell } from 'electron'
import type { AppInfo, AppSettings, BookingConfig, LoginResult, Reservation, SearchRequest, SessionInfo } from '../shared/types'
import { STATION_NAMES } from '../shared/stations'
import type { BookingEngine } from './booking/engine'
import type { KorailClient } from './korail/client'
import { API_VERSION, KORAIL_HOST } from './korail/constants'
import { describeError } from './korail/errors'
import type { CredentialStore } from './store/credentials'
import type { SettingsStore } from './store/settings'

export interface IpcContext {
  client: KorailClient
  engine: BookingEngine
  settings: SettingsStore
  credentials: CredentialStore
  /** In-memory copy of the last successful login, used for automatic re-login. */
  session: { credentials: { id: string; password: string } | null }
}

type Handler = (...args: never[]) => unknown

/** Wrap a handler so renderer-side callers get a clean Error message instead of a serialized stack. */
function handle(channel: string, fn: Handler): void {
  ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
    try {
      return await (fn as (...a: unknown[]) => unknown)(...args)
    } catch (e) {
      throw new Error(describeError(e))
    }
  })
}

export function registerIpc(ctx: IpcContext): void {
  const { client, engine, settings, credentials, session } = ctx

  const sessionInfo = (): SessionInfo => ({
    loggedIn: client.loggedIn,
    name: client.user?.name,
    membershipNumber: client.user?.membershipNumber,
    email: client.user?.email,
  })

  const doLogin = async (id: string, password: string): Promise<LoginResult> => {
    const result = await client.login(id, password)
    session.credentials = { id, password }
    return result
  }

  handle('auth:login', async (payload: { id: string; password: string; remember: boolean }) => {
    const id = String(payload?.id ?? '').trim()
    const password = String(payload?.password ?? '')
    if (!id || !password) throw new Error('아이디와 비밀번호를 입력하세요.')
    const result = await doLogin(id, password)
    // The Korail login already succeeded above; remembering the password is a convenience and must
    // never turn that success into a failure.
    if (payload.remember) {
      let saved = false
      try {
        saved = credentials.save({ id, password })
      } catch (e) {
        console.warn(`[credentials] 저장 실패: ${describeError(e)}`)
      }
      if (!saved) {
        result.message = '이 환경에서는 안전한 저장소를 사용할 수 없어 로그인 정보를 저장하지 않았습니다.'
      }
    } else {
      credentials.clear()
    }
    return result
  })

  handle('auth:loginWithSaved', async () => {
    const saved = credentials.load()
    if (!saved) {
      if (credentials.peekId()) {
        // The file exists but cannot be decrypted (portable exe moved to another PC, new user profile,
        // changed keyring): drop it so the UI stops offering it.
        credentials.clear()
        throw new Error('저장된 로그인 정보를 읽을 수 없어 삭제했습니다. 비밀번호를 다시 입력해 로그인하세요.')
      }
      throw new Error('저장된 로그인 정보가 없습니다.')
    }
    return doLogin(saved.id, saved.password)
  })

  handle('auth:logout', async () => {
    engine.stop()
    session.credentials = null
    await client.logout()
  })

  handle('auth:session', () => sessionInfo())

  handle('auth:savedLogin', () => {
    const id = credentials.peekId()
    return id ? { id, hasPassword: credentials.canRemember() } : null
  })

  handle('auth:clearSavedLogin', () => credentials.clear())

  handle('trains:search', async (req: SearchRequest) => {
    if (!client.loggedIn) throw new Error('먼저 로그인하세요.')
    const dep = String(req?.dep ?? '').trim()
    const arr = String(req?.arr ?? '').trim()
    if (!dep || !arr) throw new Error('출발역과 도착역을 입력하세요.')
    const trains = await client.searchWindow({
      dep,
      arr,
      date: String(req.date ?? '').replace(/-/g, ''),
      timeFrom: String(req.timeFrom ?? '0000'),
      timeTo: String(req.timeTo ?? '2359'),
      passengers: req.passengers,
    })
    settings.save({ lastSearch: { dep, arr, date: req.date, timeFrom: req.timeFrom, timeTo: req.timeTo, categories: req.categories, passengers: req.passengers } })
    return trains
  })

  handle('booking:start', (config: BookingConfig) => {
    const state = engine.start(config)
    settings.save({
      lastSearch: { dep: config.dep, arr: config.arr, date: config.date, timeFrom: config.timeFrom, timeTo: config.timeTo, categories: config.categories, passengers: config.passengers },
      seatPreference: config.seatPreference,
      allowWaitingList: config.allowWaitingList,
      intervalMs: config.intervalMs,
      jitterMs: config.jitterMs,
      maxAttempts: config.maxAttempts,
    })
    return state
  })

  handle('booking:stop', () => engine.stop())
  handle('booking:state', () => engine.getState())

  handle('reservations:list', async () => {
    if (!client.loggedIn) throw new Error('먼저 로그인하세요.')
    return client.reservations()
  })

  handle('reservations:cancel', async (rsv: Reservation) => {
    if (!client.loggedIn) throw new Error('먼저 로그인하세요.')
    if (!rsv?.rsvId) throw new Error('예약 번호가 없습니다.')
    return client.cancel(rsv)
  })

  handle('settings:get', () => settings.get())
  handle('settings:save', (patch: Partial<AppSettings>) => settings.save(patch ?? {}))
  handle('stations:list', () => STATION_NAMES)

  handle('app:info', (): AppInfo => ({
    version: app.getVersion(),
    host: KORAIL_HOST,
    apiVersion: API_VERSION,
    platform: process.platform,
  }))

  handle('app:openExternal', async (url: string) => {
    let parsed: URL
    try {
      parsed = new URL(String(url))
    } catch {
      throw new Error('잘못된 주소입니다.')
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('http(s) 주소만 열 수 있습니다.')
    await shell.openExternal(parsed.toString())
  })
}

export function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}
