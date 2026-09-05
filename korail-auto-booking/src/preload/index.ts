import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { AppSettings, BookingConfig, BookingState, KorailBridge, LogEntry, Reservation, SearchRequest } from '../shared/types'

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const bridge: KorailBridge = {
  login: (id: string, password: string, remember: boolean) => ipcRenderer.invoke('auth:login', { id, password, remember }),
  loginWithSaved: () => ipcRenderer.invoke('auth:loginWithSaved'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getSession: () => ipcRenderer.invoke('auth:session'),
  getSavedLogin: () => ipcRenderer.invoke('auth:savedLogin'),
  clearSavedLogin: () => ipcRenderer.invoke('auth:clearSavedLogin'),
  searchTrains: (req: SearchRequest) => ipcRenderer.invoke('trains:search', req),
  startBooking: (config: BookingConfig) => ipcRenderer.invoke('booking:start', config),
  stopBooking: () => ipcRenderer.invoke('booking:stop'),
  getBookingState: () => ipcRenderer.invoke('booking:state'),
  getReservations: () => ipcRenderer.invoke('reservations:list'),
  cancelReservation: (rsv: Reservation) => ipcRenderer.invoke('reservations:cancel', rsv),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch: Partial<AppSettings>) => ipcRenderer.invoke('settings:save', patch),
  getStations: () => ipcRenderer.invoke('stations:list'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  onLog: (cb: (entry: LogEntry) => void) => subscribe<LogEntry>('booking:log', cb),
  onState: (cb: (state: BookingState) => void) => subscribe<BookingState>('booking:state', cb),
}

contextBridge.exposeInMainWorld('korail', bridge)
