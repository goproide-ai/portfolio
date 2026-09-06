import type { BookingConfig, SeatPreference, Train } from '../../shared/types'
import { inWindow, matchesCategory } from '../../shared/trains'
import { chooseSeatClass } from '../korail/client'

export { ALL_CATEGORIES, CATEGORY_LABELS, categoryOf, describeTrain, formatDate, formatTime, inWindow, matchesCategory, windowBounds } from '../../shared/trains'

export function isBookable(train: Train, preference: SeatPreference, allowWaitingList: boolean): boolean {
  return chooseSeatClass(train, preference, allowWaitingList) !== null
}

/** Trains the user is interested in (window + category + explicit targets), regardless of availability. */
export function selectTargets(trains: Train[], config: BookingConfig): Train[] {
  const targets = new Set(config.targetTrainKeys ?? [])
  return trains.filter((t) => {
    if (!inWindow(t, config.timeFrom, config.timeTo)) return false
    if (targets.size > 0) return targets.has(t.key)
    return matchesCategory(t, config.categories)
  })
}

/**
 * Targets that can be reserved right now, ordered by departure time. Trains whose waiting list was
 * already joined (`waitlisted`) only count when they have a real seat.
 */
export function selectCandidates(trains: Train[], config: BookingConfig, waitlisted: ReadonlySet<string> = new Set()): Train[] {
  return selectTargets(trains, config)
    .filter((t) => isBookable(t, config.seatPreference, config.allowWaitingList && !waitlisted.has(t.key)))
    .sort((a, b) => (a.depTime < b.depTime ? -1 : a.depTime > b.depTime ? 1 : 0))
}
