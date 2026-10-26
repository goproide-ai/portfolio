export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isoToCompact(iso: string): string {
  return iso.replace(/-/g, '')
}

export function compactToISO(compact: string): string {
  if (!/^\d{8}$/.test(compact)) return compact
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
}

export function clock(ts: number | null): string {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleTimeString('ko-KR', { hour12: false })
}

export function elapsed(from: number | null, now: number): string {
  if (!from) return '-'
  const s = Math.max(0, Math.floor((now - from) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}시간 ${m}분 ${sec}초`
  if (m > 0) return `${m}분 ${sec}초`
  return `${sec}초`
}

/** Parse yyyyMMdd + hhmmss (Korail returns KST wall-clock) into an absolute Date, anchored to UTC+9. */
export function deadlineDate(date: string, time: string): Date | null {
  // Korail sends 00000000 (no deadline yet) for waiting-list entries; that is "unknown", not year 0.
  if (!/^\d{8}$/.test(date) || /^0+$/.test(date) || !/^\d{4,6}$/.test(time)) return null
  const y = Number(date.slice(0, 4))
  const mo = Number(date.slice(4, 6)) - 1
  const d = Number(date.slice(6, 8))
  const h = Number(time.slice(0, 2))
  const mi = Number(time.slice(2, 4))
  const s = time.length >= 6 ? Number(time.slice(4, 6)) : 0
  // Date.UTC with h-9 converts the KST wall-clock to the correct absolute instant on any timezone,
  // and handles the negative-hour rollover for early-morning deadlines.
  return new Date(Date.UTC(y, mo, d, h - 9, mi, s))
}

export function remaining(deadline: Date | null, now: number): string {
  if (!deadline) return ''
  const diff = Math.floor((deadline.getTime() - now) / 1000)
  if (diff <= 0) return '기한 경과'
  const m = Math.floor(diff / 60)
  const s = diff % 60
  return `${m}분 ${String(s).padStart(2, '0')}초 남음`
}
