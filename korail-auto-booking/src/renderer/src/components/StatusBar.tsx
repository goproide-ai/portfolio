import type { JSX } from 'react'
import type { BookingState } from '../../../shared/types'
import { clock, elapsed } from '../lib/format'
import { useNow } from '../lib/useNow'

interface Props {
  state: BookingState
}

const LABELS: Record<BookingState['status'], string> = {
  idle: '대기 중',
  running: '자동 예매 실행 중',
  success: '예약 성공',
  stopped: '중지됨',
  error: '오류로 중지됨',
}

export function StatusBar({ state }: Props): JSX.Element {
  const now = useNow(state.status === 'running')
  const nextIn = state.nextCheckAt ? Math.max(0, Math.ceil((state.nextCheckAt - now) / 1000)) : null

  return (
    <section className={`card statusbar status-${state.status}`}>
      <div className="status-main">
        <span className={`pill ${state.status}`}>
          {state.status === 'running' && <span className="spinner" aria-hidden="true" />}
          {LABELS[state.status]}
        </span>
        {state.error && <span className="status-error">{state.error}</span>}
      </div>
      <dl className="stats">
        <div>
          <dt>시도</dt>
          <dd>{state.attempts}회</dd>
        </div>
        <div>
          <dt>마지막 조회</dt>
          <dd>{clock(state.lastCheckedAt)}</dd>
        </div>
        <div>
          <dt>다음 조회</dt>
          <dd>{state.status === 'running' ? (nextIn === null ? '조회 중…' : `${nextIn}초 후`) : '-'}</dd>
        </div>
        <div>
          <dt>경과</dt>
          <dd>{state.status === 'running' ? elapsed(state.startedAt, now) : state.startedAt ? elapsed(state.startedAt, state.lastCheckedAt ?? state.startedAt) : '-'}</dd>
        </div>
      </dl>
    </section>
  )
}
