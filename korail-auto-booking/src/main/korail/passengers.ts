import type { Passengers } from '../../shared/types'
import { PASSENGER_ROWS, type PassengerRowKey } from './constants'

export const EMPTY_PASSENGERS: Passengers = { adult: 0, child: 0, toddler: 0, senior: 0 }

export function normalizePassengers(p: Partial<Passengers> | undefined): Passengers {
  const clamp = (n: unknown): number => {
    const v = Math.floor(Number(n))
    return Number.isFinite(v) && v > 0 ? Math.min(v, 9) : 0
  }
  const out = {
    adult: clamp(p?.adult),
    child: clamp(p?.child),
    toddler: clamp(p?.toddler),
    senior: clamp(p?.senior),
  }
  if (totalPassengers(out) === 0) out.adult = 1
  return out
}

export function totalPassengers(p: Passengers): number {
  return p.adult + p.child + p.toddler + p.senior
}

/** Query parameters describing passengers for ScheduleView (the app has five flags; 유아 rides in the child slot). */
export function searchPassengerParams(p: Passengers): Record<string, string> {
  return {
    txtPsgFlg_1: String(p.adult),
    txtPsgFlg_2: String(p.child + p.toddler),
    txtPsgFlg_3: String(p.senior),
    txtPsgFlg_4: '0',
    txtPsgFlg_5: '0',
  }
}

/** The eight passenger rows of TicketReservation (txtCompaCnt{i}, txtPsgTpCd{i}, txtDiscKndCd{i}), always all present. */
export function reservePassengerParams(p: Passengers): Record<string, string> {
  const counts: Record<PassengerRowKey, number> = {
    adult: p.adult,
    youth: 0,
    child: p.child,
    toddler: p.toddler,
    senior: p.senior,
    disability1to3: 0,
    disability4to6: 0,
    guideDog: 0,
  }
  const params: Record<string, string> = { txtTotPsgCnt: String(totalPassengers(p)) }
  PASSENGER_ROWS.forEach((row, i) => {
    const n = i + 1
    params[`txtCompaCnt${n}`] = String(counts[row.key])
    params[`txtPsgTpCd${n}`] = row.type
    params[`txtDiscKndCd${n}`] = row.discount
  })
  return params
}
