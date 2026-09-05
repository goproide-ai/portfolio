import { BrowserWindow, Notification } from 'electron'
import type { Reservation } from '../shared/types'
import { formatDeadline } from './booking/engine'
import { formatTime } from './booking/matcher'

/** Show a desktop notification (best effort) and make the window ask for attention. */
function notify(title: string, body: string, win: BrowserWindow | null, onClick: () => void): void {
  try {
    if (Notification.isSupported()) {
      const n = new Notification({ title, body, urgency: 'critical' })
      n.on('click', onClick)
      // Unsigned macOS bundles and some Linux desktops cannot deliver notifications; the window
      // flash / in-app banner below still carries the news.
      n.on('failed', (_event, error) => console.warn(`[notify] 알림 표시 실패: ${error}`))
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

export function notifyReservation(rsv: Reservation, win: BrowserWindow | null, onClick: () => void): void {
  const body =
    `${rsv.trainTypeName} ${rsv.trainNo}편 ${rsv.depName} ${formatTime(rsv.depTime)} → ${rsv.arrName} ${formatTime(rsv.arrTime)}\n` +
    `예약번호 ${rsv.rsvId}` +
    (rsv.buyLimitTime ? ` · 결제기한 ${formatDeadline(rsv)}` : '') +
    '\n코레일톡에서 결제해야 예약이 확정됩니다.'
  notify(rsv.waiting ? '예약대기 등록 완료' : '열차 예약 성공!', body, win, onClick)
}

/** An unattended run stopped on an error: say so outside the window too. */
export function notifyStopped(message: string, win: BrowserWindow | null, onClick: () => void): void {
  notify('자동 예매가 중지되었습니다', message, win, onClick)
}
