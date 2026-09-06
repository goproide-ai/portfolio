import type { JSX } from 'react'
import type { BookingStatus, SeatPreference } from '../../../shared/types'

export interface BookingOptions {
  seatPreference: SeatPreference
  allowWaitingList: boolean
  continueAfterWaitlist: boolean
  waitlistSmsPhone: string
  intervalSec: number
  jitterSec: number
  maxAttempts: number
  soundOnSuccess: boolean
  notifyOnSuccess: boolean
}

interface Props {
  options: BookingOptions
  onChange: (next: BookingOptions) => void
  running: boolean
  status: BookingStatus
  canStart: boolean
  selectedCount: number
  eligibleCount: number
  onStart: () => void
  onStop: () => void
}

const SEAT_OPTIONS: Array<[SeatPreference, string]> = [
  ['GENERAL_FIRST', '일반실 우선 (없으면 특실)'],
  ['GENERAL_ONLY', '일반실만'],
  ['SPECIAL_FIRST', '특실 우선 (없으면 일반실)'],
  ['SPECIAL_ONLY', '특실만'],
]

export function BookingControls({ options, onChange, running, status, canStart, selectedCount, eligibleCount, onStart, onStop }: Props): JSX.Element {
  const set = <K extends keyof BookingOptions>(key: K, v: BookingOptions[K]): void => onChange({ ...options, [key]: v })
  const tooFast = options.intervalSec < 3

  return (
    <section className="card">
      <h2>자동 예매 설정</h2>

      <label className="field">
        <span>좌석 등급</span>
        <select value={options.seatPreference} onChange={(e) => set('seatPreference', e.target.value as SeatPreference)} disabled={running}>
          {SEAT_OPTIONS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={options.allowWaitingList} onChange={(e) => set('allowWaitingList', e.target.checked)} disabled={running} />
        <span>좌석이 없으면 예약대기라도 신청</span>
      </label>
      {options.allowWaitingList && (
        <>
          <label className="check sub">
            <input type="checkbox" checked={options.continueAfterWaitlist} onChange={(e) => set('continueAfterWaitlist', e.target.checked)} disabled={running} />
            <span>예약대기 등록 후에도 빈 좌석 계속 찾기</span>
          </label>
          <label className="field sub">
            <span>좌석 배정 알림 받을 휴대폰 번호 (선택, 문자·카카오톡)</span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="010-1234-5678"
              value={options.waitlistSmsPhone}
              onChange={(e) => set('waitlistSmsPhone', e.target.value.replace(/[^\d-]/g, '').slice(0, 13))}
              disabled={running}
              aria-label="좌석 배정 알림 휴대폰 번호"
            />
          </label>
          <p className="hint">
            예약대기는 좌석을 확보한 것이 아니라 취소표가 나오면 신청 순서대로 배정받는 신청입니다. 코레일+ 앱의 예약 내역(미결제 예약 조회)에서 확인되며, 좌석이
            배정되면 결제기한이 생기고 그때 결제해야 확정됩니다. 번호를 넣으면 배정 시 문자·카카오톡 알림을 코레일에 신청합니다.
          </p>
        </>
      )}

      <div className="row">
        <label className="field">
          <span>재조회 간격 (초)</span>
          <input type="number" min={1} max={120} step={0.5} value={options.intervalSec} onChange={(e) => set('intervalSec', Math.max(1, Number(e.target.value) || 1))} disabled={running} />
        </label>
        <label className="field">
          <span>랜덤 지연 (초)</span>
          <input type="number" min={0} max={30} step={0.5} value={options.jitterSec} onChange={(e) => set('jitterSec', Math.max(0, Number(e.target.value) || 0))} disabled={running} />
        </label>
      </div>
      <label className="field">
        <span>최대 시도 횟수 (0 = 무제한)</span>
        <input type="number" min={0} max={100000} step={1} value={options.maxAttempts} onChange={(e) => set('maxAttempts', Math.max(0, Math.floor(Number(e.target.value) || 0)))} disabled={running} />
      </label>
      {tooFast && <div className="alert warn">3초 미만으로 조회하면 코레일 서버가 요청을 차단하거나 계정 이용이 제한될 수 있습니다.</div>}

      <div className="checks inline">
        <label className="check">
          <input type="checkbox" checked={options.soundOnSuccess} onChange={(e) => set('soundOnSuccess', e.target.checked)} />
          <span>성공 시 알림음</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={options.notifyOnSuccess} onChange={(e) => set('notifyOnSuccess', e.target.checked)} />
          <span>데스크탑 알림</span>
        </label>
      </div>

      <p className="hint">
        대상: {selectedCount > 0 ? <strong>선택한 열차 {selectedCount}편</strong> : <strong>시간대 내 조건에 맞는 모든 열차{eligibleCount > 0 ? ` (${eligibleCount}편)` : ''}</strong>}
      </p>

      <div className="actions">
        {running ? (
          <button type="button" className="btn danger wide" onClick={onStop}>
            자동 예매 중지
          </button>
        ) : (
          <button type="button" className="btn success wide" onClick={onStart} disabled={!canStart}>
            {status === 'success' ? '다시 시작' : '자동 예매 시작'}
          </button>
        )}
      </div>
    </section>
  )
}
