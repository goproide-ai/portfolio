import type { JSX } from 'react'
import type { Reservation } from '../../../shared/types'
import { formatDate, formatPrice, formatTime } from '../../../shared/trains'
import { deadlineDate, remaining } from '../lib/format'
import { useNow } from '../lib/useNow'

interface Props {
  /** The reservation just made by the engine, shown prominently. */
  highlight: Reservation | null
  reservations: Reservation[]
  busy: boolean
  onRefresh: () => void
  onCancel: (rsv: Reservation) => void
  onOpenKorail: () => void
}

function Deadline({ rsv, now }: { rsv: Reservation; now: number }): JSX.Element {
  const d = deadlineDate(rsv.buyLimitDate, rsv.buyLimitTime)
  if (!d) return <span className="muted">결제기한 정보 없음 — 코레일톡에서 확인하세요</span>
  const left = remaining(d, now)
  return (
    <span className={left === '기한 경과' ? 'deadline over' : 'deadline'}>
      결제기한 {formatDate(rsv.buyLimitDate)} {formatTime(rsv.buyLimitTime)} ({left})
    </span>
  )
}

export function ReservationPanel({ highlight, reservations, busy, onRefresh, onCancel, onOpenKorail }: Props): JSX.Element {
  const now = useNow(Boolean(highlight) || reservations.length > 0, 1000)
  const list = reservations.length > 0 ? reservations : highlight ? [highlight] : []

  return (
    <section className={`card reservation-card ${highlight ? 'highlight' : ''}`}>
      <div className="card-head">
        <h2>{highlight ? (highlight.waiting ? '예약대기 등록 완료' : '예약 성공!') : '내 예약'}</h2>
        <div className="head-actions">
          <button type="button" className="btn small" onClick={onRefresh} disabled={busy}>
            새로고침
          </button>
          <button type="button" className="btn small ghost" onClick={onOpenKorail}>
            코레일 홈페이지
          </button>
        </div>
      </div>

      {highlight && (
        <div className="success-box">
          <p>
            <strong>
              {highlight.trainTypeName} {highlight.trainNo}편
            </strong>{' '}
            {highlight.depName} {formatTime(highlight.depTime)} → {highlight.arrName} {formatTime(highlight.arrTime)} · {formatDate(highlight.runDate)}
          </p>
          <p>
            예약번호 <code>{highlight.rsvId}</code> · {highlight.seatCount}석{highlight.price > 0 ? ` · ${formatPrice(highlight.price)}` : ''}
          </p>
          <p>
            <Deadline rsv={highlight} now={now} />
          </p>
          <p className="notice">
            결제는 이 앱에서 하지 않습니다. <strong>코레일톡 앱 → 승차권 예매 → 예약승차권 조회</strong>(또는 코레일 홈페이지)에서 결제기한 안에 결제해야 예약이 확정됩니다. 기한이 지나면 예약은 자동
            취소됩니다.
          </p>
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty">예약된 승차권이 없습니다.</div>
      ) : (
        <ul className="reservations">
          {list.map((r) => (
            <li key={`${r.rsvId}-${r.trainNo}`}>
              <div>
                <strong>
                  {r.trainTypeName} {r.trainNo}편
                </strong>{' '}
                {formatDate(r.runDate)} {r.depName} {formatTime(r.depTime)} → {r.arrName} {formatTime(r.arrTime)}
                <div className="muted">
                  예약번호 {r.rsvId} · {r.seatCount}석{r.price > 0 ? ` · ${formatPrice(r.price)}` : ''} · <Deadline rsv={r} now={now} />
                </div>
              </div>
              <button type="button" className="btn small danger ghost" onClick={() => onCancel(r)} disabled={busy}>
                예약 취소
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
