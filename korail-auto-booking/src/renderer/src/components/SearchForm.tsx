import type { JSX } from 'react'
import type { Passengers, TrainCategory } from '../../../shared/types'
import { ALL_CATEGORIES, CATEGORY_LABELS } from '../../../shared/trains'
import { todayISO } from '../lib/format'

export interface SearchFormValue {
  dep: string
  arr: string
  /** yyyy-mm-dd */
  date: string
  /** HH:MM */
  timeFrom: string
  timeTo: string
  categories: TrainCategory[]
  passengers: Passengers
}

interface Props {
  value: SearchFormValue
  onChange: (next: SearchFormValue) => void
  stations: string[]
  onSearch: () => void
  searching: boolean
  disabled: boolean
}

const PASSENGER_LABELS: Array<[keyof Passengers, string]> = [
  ['adult', '어른'],
  ['child', '어린이'],
  ['toddler', '유아'],
  ['senior', '경로'],
]

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function SearchForm({ value, onChange, stations, onSearch, searching, disabled }: Props): JSX.Element {
  const set = <K extends keyof SearchFormValue>(key: K, v: SearchFormValue[K]): void => onChange({ ...value, [key]: v })
  const toggleCategory = (c: TrainCategory): void => {
    const has = value.categories.includes(c)
    set('categories', has ? value.categories.filter((x) => x !== c) : [...value.categories, c])
  }
  const setPassenger = (k: keyof Passengers, n: number): void => {
    set('passengers', { ...value.passengers, [k]: Math.max(0, Math.min(9, Math.floor(n) || 0)) })
  }
  const total = Object.values(value.passengers).reduce((a, b) => a + b, 0)
  const today = todayISO()

  return (
    <section className="card">
      <h2>조회 조건</h2>
      <datalist id="station-list">
        {stations.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="row stations">
        <label className="field">
          <span>출발역</span>
          <input list="station-list" value={value.dep} onChange={(e) => set('dep', e.target.value)} disabled={disabled} placeholder="서울" />
        </label>
        <button
          type="button"
          className="btn icon"
          title="출발/도착 바꾸기"
          onClick={() => onChange({ ...value, dep: value.arr, arr: value.dep })}
          disabled={disabled}
        >
          ⇄
        </button>
        <label className="field">
          <span>도착역</span>
          <input list="station-list" value={value.arr} onChange={(e) => set('arr', e.target.value)} disabled={disabled} placeholder="부산" />
        </label>
      </div>

      <div className="row">
        <label className="field">
          <span>날짜</span>
          <input type="date" value={value.date} min={today} max={addDays(today, 31)} onChange={(e) => set('date', e.target.value)} disabled={disabled} />
        </label>
      </div>
      <div className="row">
        <label className="field">
          <span>출발 시각 (부터)</span>
          <input type="time" value={value.timeFrom} onChange={(e) => set('timeFrom', e.target.value)} disabled={disabled} />
        </label>
        <label className="field">
          <span>출발 시각 (까지)</span>
          <input type="time" value={value.timeTo} onChange={(e) => set('timeTo', e.target.value)} disabled={disabled} />
        </label>
      </div>

      <fieldset className="field">
        <legend>열차 종류 {value.categories.length === 0 && <em className="muted">(전체)</em>}</legend>
        <div className="checks">
          {ALL_CATEGORIES.map((c) => (
            <label key={c} className="check">
              <input type="checkbox" checked={value.categories.includes(c)} onChange={() => toggleCategory(c)} disabled={disabled} />
              <span>{CATEGORY_LABELS[c]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>승객 (총 {total}명)</legend>
        <div className="passengers">
          {PASSENGER_LABELS.map(([k, label]) => (
            <label key={k} className="counter">
              <span>{label}</span>
              <input
                type="number"
                min={0}
                max={9}
                value={value.passengers[k]}
                onChange={(e) => setPassenger(k, Number(e.target.value))}
                disabled={disabled}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="actions">
        <button type="button" className="btn primary wide" onClick={onSearch} disabled={disabled || searching || !value.dep || !value.arr}>
          {searching ? '조회 중…' : '열차 조회'}
        </button>
      </div>
    </section>
  )
}
