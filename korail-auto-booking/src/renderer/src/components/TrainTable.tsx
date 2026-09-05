import type { JSX } from 'react'
import type { SeatPreference, Train, TrainCategory } from '../../../shared/types'
import { durationMinutes, formatDuration, formatTime, matchesCategory } from '../../../shared/trains'

interface Props {
  trains: Train[]
  searched: boolean
  selected: Set<string>
  onToggle: (key: string) => void
  onSelectKeys: (keys: string[]) => void
  categories: TrainCategory[]
  seatPreference: SeatPreference
  allowWaitingList: boolean
  running: boolean
}

function seatBadge(code: string, available: boolean): JSX.Element {
  if (available) return <span className="badge ok">예약가능</span>
  if (code === '13') return <span className="badge soldout">매진</span>
  if (code === '00' || code === '') return <span className="badge none">없음</span>
  return <span className="badge none">{code}</span>
}

function bookable(t: Train, pref: SeatPreference, waiting: boolean): boolean {
  const general = t.hasGeneralSeat
  const special = t.hasSpecialSeat
  let ok = false
  if (pref === 'GENERAL_ONLY') ok = general
  else if (pref === 'SPECIAL_ONLY') ok = special
  else ok = general || special
  if (!ok && waiting && pref !== 'SPECIAL_ONLY') ok = t.hasWaitingList
  return ok
}

export function TrainTable({ trains, searched, selected, onToggle, onSelectKeys, categories, seatPreference, allowWaitingList, running }: Props): JSX.Element {
  const eligible = trains.filter((t) => matchesCategory(t, categories))
  const bookableNow = eligible.filter((t) => bookable(t, seatPreference, allowWaitingList)).length
  const soldOut = eligible.filter((t) => !bookable(t, seatPreference, allowWaitingList)).map((t) => t.key)

  return (
    <section className="card table-card">
      <div className="card-head">
        <h2>
          열차 목록 <span className="muted">({trains.length}편 · 조건 일치 {eligible.length}편 · 지금 예약 가능 {bookableNow}편)</span>
        </h2>
        <div className="head-actions">
          <button type="button" className="btn small" onClick={() => onSelectKeys(soldOut)} disabled={running || soldOut.length === 0} title="매진된 열차만 선택">
            매진 열차 선택
          </button>
          <button type="button" className="btn small" onClick={() => onSelectKeys(eligible.map((t) => t.key))} disabled={running || eligible.length === 0}>
            전체 선택
          </button>
          <button type="button" className="btn small ghost" onClick={() => onSelectKeys([])} disabled={running || selected.size === 0}>
            선택 해제
          </button>
        </div>
      </div>
      <p className="hint">
        체크한 열차만 노립니다. 아무것도 체크하지 않으면 시간대 안의 조건에 맞는 <strong>모든 열차</strong>를 대상으로 빈 좌석이 생기는 즉시 예약합니다.
      </p>

      {trains.length === 0 ? (
        <div className="empty">{searched ? '조건에 맞는 열차가 없습니다. 시간대나 날짜를 바꿔 다시 조회하세요.' : '왼쪽에서 조건을 입력하고 "열차 조회"를 누르세요.'}</div>
      ) : (
        <div className="table-wrap">
          <table className="trains">
            <thead>
              <tr>
                <th className="col-check">대상</th>
                <th>열차</th>
                <th>출발</th>
                <th>도착</th>
                <th>소요</th>
                <th>일반실</th>
                <th>특실</th>
                <th>예약대기</th>
              </tr>
            </thead>
            <tbody>
              {trains.map((t) => {
                const inCategory = matchesCategory(t, categories)
                const can = bookable(t, seatPreference, allowWaitingList)
                const checked = selected.has(t.key)
                return (
                  <tr key={t.key} className={[!inCategory ? 'excluded' : '', can ? 'bookable' : '', checked ? 'selected' : ''].join(' ').trim()}>
                    <td className="col-check">
                      <input type="checkbox" checked={checked} onChange={() => onToggle(t.key)} disabled={running || !inCategory} aria-label={`${t.trainTypeName} ${t.trainNo} 선택`} />
                    </td>
                    <td>
                      <strong>{t.trainTypeName}</strong> <span className="muted">{t.trainNo}</span>
                    </td>
                    <td>
                      {formatTime(t.depTime)} <span className="muted">{t.depName}</span>
                    </td>
                    <td>
                      {formatTime(t.arrTime)} <span className="muted">{t.arrName}</span>
                    </td>
                    <td className="muted">{formatDuration(durationMinutes(t.depTime, t.arrTime))}</td>
                    <td>{seatBadge(t.generalSeat, t.hasGeneralSeat)}</td>
                    <td>{seatBadge(t.specialSeat, t.hasSpecialSeat)}</td>
                    <td>{t.hasWaitingList ? <span className="badge wait">가능</span> : <span className="muted">-</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
