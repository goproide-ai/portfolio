import type { Train, TrainCategory } from './types'

export const CATEGORY_LABELS: Record<TrainCategory, string> = {
  KTX: 'KTX (산천·이음·청룡 포함)',
  ITX: 'ITX (새마을·청춘·마음)',
  SAEMAEUL: '새마을호',
  MUGUNGHWA: '무궁화호·누리로',
  OTHER: '기타 (통근열차 등)',
}

export const ALL_CATEGORIES: TrainCategory[] = ['KTX', 'ITX', 'SAEMAEUL', 'MUGUNGHWA', 'OTHER']

/** Classify a train by its type name (h_trn_clsf_nm) so new codes keep working. */
export function categoryOf(train: Pick<Train, 'trainTypeName'>): TrainCategory {
  const n = (train.trainTypeName || '').toUpperCase().replace(/\s+/g, '')
  if (n.includes('KTX')) return 'KTX'
  if (n.includes('ITX')) return 'ITX'
  if (n.includes('새마을')) return 'SAEMAEUL'
  if (n.includes('무궁화') || n.includes('누리로')) return 'MUGUNGHWA'
  return 'OTHER'
}

export function matchesCategory(train: Pick<Train, 'trainTypeName'>, categories: TrainCategory[]): boolean {
  if (!categories || categories.length === 0) return true
  return categories.includes(categoryOf(train))
}

/** hhmm or hh:mm → hhmm00 / hhmm59 bounds */
export function windowBounds(timeFrom: string, timeTo: string): { from: string; to: string } {
  const f = timeFrom.replace(':', '').slice(0, 4).padEnd(4, '0')
  const t = timeTo.replace(':', '').slice(0, 4).padEnd(4, '0')
  return { from: `${f}00`, to: `${t}59` }
}

export function inWindow(train: Pick<Train, 'depTime'>, timeFrom: string, timeTo: string): boolean {
  const { from, to } = windowBounds(timeFrom, timeTo)
  return train.depTime >= from && train.depTime <= to
}

export function formatTime(hhmmss: string): string {
  if (!hhmmss || hhmmss.length < 4) return hhmmss || ''
  return `${hhmmss.slice(0, 2)}:${hhmmss.slice(2, 4)}`
}

export function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || ''
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

/** Minutes between two hhmmss values (same day, or crossing midnight). */
export function durationMinutes(depTime: string, arrTime: string): number | null {
  const toMin = (t: string): number | null => {
    if (!t || t.length < 4) return null
    const h = parseInt(t.slice(0, 2), 10)
    const m = parseInt(t.slice(2, 4), 10)
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
  }
  const a = toMin(depTime)
  const b = toMin(arrTime)
  if (a === null || b === null) return null
  return b >= a ? b - a : b + 24 * 60 - a
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`
}

export function formatPrice(won: number): string {
  return `${won.toLocaleString('ko-KR')}원`
}

export function describeTrain(t: Train): string {
  return `${t.trainTypeName} ${t.trainNo}편 ${t.depName} ${formatTime(t.depTime)} → ${t.arrName} ${formatTime(t.arrTime)}`
}
