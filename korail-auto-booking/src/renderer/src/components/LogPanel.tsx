import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import type { LogEntry } from '../../../shared/types'

/** A log entry carrying a stable, monotonic id so React keys survive the ring buffer dropping its head. */
export type IdLogEntry = LogEntry & { id: number }

interface Props {
  logs: IdLogEntry[]
  onClear: () => void
}

function stamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour12: false })
}

export function LogPanel({ logs, onClear }: Props): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  useEffect(() => {
    const el = ref.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
    // Depend on the array identity (new on every push), not its length — the ring buffer keeps the
    // length fixed at the cap, so a length dep would stop auto-scrolling once it fills.
  }, [logs])

  const onScroll = (): void => {
    const el = ref.current
    if (!el) return
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
  }

  return (
    <section className="card log-card">
      <div className="card-head">
        <h2>진행 로그</h2>
        <button type="button" className="btn small ghost" onClick={onClear} disabled={logs.length === 0}>
          지우기
        </button>
      </div>
      <div className="log" ref={ref} onScroll={onScroll} data-testid="log">
        {logs.length === 0 ? (
          <div className="muted">아직 기록이 없습니다.</div>
        ) : (
          logs.map((l) => (
            <div key={l.id} className={`log-line ${l.level}`}>
              <span className="log-time">{stamp(l.ts)}</span>
              <span className="log-msg">{l.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
