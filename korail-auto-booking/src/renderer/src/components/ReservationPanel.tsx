import type { JSX } from 'react'
import type { Reservation } from '../../../shared/types'
import { formatDate, formatPrice, formatTime } from '../../../shared/trains'
import { deadlineDate, remaining } from '../lib/format'
import { useNow } from '../lib/useNow'

interface Props {
  /** The reservation (or waiting-list entry) just made by the engine, shown prominently. */
  highlight: Reservation | null
  /** True while the engine is still polling for a real seat after joining a waiting list. */
  stillSearching?: boolean
  reservations: Reservation[]
  busy: boolean
  onRefresh: () => void
  onCancel: (rsv: Reservation) => void
  onOpenKorail: () => void
}

function Deadline({ rsv, now }: { rsv: Reservation; now: number }): JSX.Element {
  if (rsv.waiting) {
    return <span className="muted">좌석 배정 대기 중 — 결제기한은 좌석이 배정된 뒤 코레일+ 앱에 표시됩니다</span>
  }
  const d = deadlineDate(rsv.buyLimitDate, rsv.buyLimitTime)
  if (!d) return <span className="muted">결제기한 정보 없음 — 코레일+ 앱에서 확인하세요</span>
  const left = remaining(d, now)
  return (
    <span className={left === '기한 경과' ? 'deadline over' : 'deadline'}>
      결제기한 {formatDate(rsv.buyLimitDate)} {formatTime(rsv.buyLimitTime)} ({left})
    </span>
  )
}

function Notice({ rsv, stillSearching }: { rsv: Reservation; stillSearching: boolean }): JSX.Element {
  if (rsv.waiting) {
    return (
      <p className="notice">
        <strong>예약대기는 좌석을 확보한 것이 아니라</strong> 취소표가 나오면 신청 순서대로 좌석을 배정받는 신청입니다. 코레일+ 앱에서 <strong>결제 전 예약을
        조회하는 화면</strong>(예약 승차권 조회·예약 내역 등, 메뉴 이름은 앱 버전에 따라 다를 수 있음)에 다른 미결제 예약과 함께 표시되며, 결제 완료 승차권
        목록에는 나오지 않습니다. 좌석이 배정되기 전에는 결제기한이 없고, 배정되면 코레일+ 앱(알림을 신청한 경우 문자·카카오톡)으로 결제기한이 안내됩니다. 그
        기한 안에 결제해야 승차권이 확정됩니다.
        {stillSearching ? ' 이 앱은 좌석이 배정될 때까지 빈 좌석을 계속 찾습니다. 빈 좌석을 예약하면 이 예약대기는 코레일+ 앱에서 취소하세요.' : ''}
      </p>
    )
  }
  return (
    <p className="notice">
      결제는 이 앱에서 하지 않습니다. <strong>코레일+ 앱의 승차권 확인(예약 내역)</strong> 또는 코레일 홈페이지에서 결제기한 안에 결제해야 예약이 확정됩니다.
      기한이 지나면 예약은 자동 취소됩니다.
    </p>
  )
}

export function ReservationPanel({ highlight, stillSearching = false, reservations, busy, onRefresh, onCancel, onOpenKorail }: Props): JSX.Element {
  const now = useNow(Boolean(highlight) || reservations.length > 0, 1000)
  const list = reservations.length > 0 ? reservations : highlight ? [highlight] : []
  const title = highlight ? (highlight.waiting ? (stillSearching ? '예약대기 등록됨 · 빈 좌석 계속 찾는 중' : '예약대기 등록 완료') : '예약 성공!') : '내 예약'

  return (
    <section className={`card reservation-card ${highlight ? (highlight.waiting ? 'highlight waiting' : 'highlight') : ''}`}>
      <div className="card-head">
        <h2>{title}</h2>
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
            {highlight.waiting ? '예약대기번호' : '예약번호'} <code>{highlight.rsvId}</code> · {highlight.seatCount}석
            {highlight.price > 0 ? ` · ${formatPrice(highlight.price)}` : ''}
          </p>
          <p>
            <Deadline rsv={highlight} now={now} />
          </p>
          <Notice rsv={highlight} stillSearching={stillSearching} />
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty">예약된 승차권이 없습니다.</div>
      ) : (
        <ul className="reservations">
          {list.map((r) => (
            <li key={`${r.rsvId}-${r.trainNo}`}>
              <div>
                {r.waiting && <span className="tag waiting">예약대기</span>}
                <strong>
                  {r.trainTypeName} {r.trainNo}편
                </strong>{' '}
                {formatDate(r.runDate)} {r.depName} {formatTime(r.depTime)} → {r.arrName} {formatTime(r.arrTime)}
                <div className="muted">
                  {r.waiting ? '예약대기번호' : '예약번호'} {r.rsvId} · {r.seatCount}석{r.price > 0 ? ` · ${formatPrice(r.price)}` : ''} · <Deadline rsv={r} now={now} />
                </div>
              </div>
              <button type="button" className="btn small danger ghost" onClick={() => onCancel(r)} disabled={busy}>
                {r.waiting ? '예약대기 취소' : '예약 취소'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
