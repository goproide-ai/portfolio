import { BrowserWindow, Notification } from 'electron'
import type { Reservation } from '../shared/types'
import { formatDeadline } from './booking/engine'
import { formatTime } from './booking/matcher'

export function notifyReservation(rsv: Reservation, win: BrowserWindow | null): void {
  const body =
    `${rsv.trainTypeName} ${rsv.trainNo}편 ${rsv.depName} ${formatTime(rsv.depTime)} → ${rsv.arrName} ${formatTime(rsv.arrTime)}\n` +
    `예약번호 ${rsv.rsvId}` +
    (rsv.buyLimitTime ? ` · 결제기한 ${formatDeadline(rsv)}` : '') +
    '\n코레일톡에서 결제해야 예약이 확정됩니다.'
  try {
    if (Notification.isSupported()) {
      const n = new Notification({ title: rsv.waiting ? '예약대기 등록 완료' : '열차 예약 성공!', body, urgency: 'critical' })
      n.on('click', () => {
        if (win && !win.isDestroyed()) {
          if (win.isMinimized()) win.restore()
          win.show()
          win.focus()
        }
      })
      n.show()
    }
  } catch {
    // Notifications are best-effort.
  }
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore()
    win.show()
    win.flashFrame(true)
  }
}
