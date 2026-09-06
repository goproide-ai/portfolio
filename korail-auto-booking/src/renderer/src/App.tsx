import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AppInfo,
  AppSettings,
  BookingConfig,
  BookingState,
  LogEntry,
  Reservation,
  SavedLogin,
  SearchRequest,
  SessionInfo,
  Train,
} from '../../shared/types'
import { inWindow, matchesCategory } from '../../shared/trains'
import { BookingControls, type BookingOptions } from './components/BookingControls'
import { LoginCard } from './components/LoginCard'
import { LogPanel, type IdLogEntry } from './components/LogPanel'
import { ReservationPanel } from './components/ReservationPanel'
import { SearchForm, type SearchFormValue } from './components/SearchForm'
import { StatusBar } from './components/StatusBar'
import { TrainTable } from './components/TrainTable'
import { errorMessage, korail } from './lib/bridge'
import { compactToISO, isoToCompact, todayISO } from './lib/format'
import { playSuccessChime } from './lib/sound'

const IDLE_STATE: BookingState = {
  status: 'idle',
  attempts: 0,
  startedAt: null,
  lastCheckedAt: null,
  nextCheckAt: null,
  reservation: null,
  waitlist: [],
  error: null,
  trains: [],
}
const MAX_LOGS = 500

function defaultForm(): SearchFormValue {
  return {
    dep: '서울',
    arr: '부산',
    date: todayISO(),
    timeFrom: '08:00',
    timeTo: '12:00',
    categories: ['KTX'],
    passengers: { adult: 1, child: 0, toddler: 0, senior: 0 },
  }
}

function defaultOptions(): BookingOptions {
  return {
    seatPreference: 'GENERAL_FIRST',
    allowWaitingList: false,
    continueAfterWaitlist: true,
    intervalSec: 4,
    jitterSec: 1.5,
    maxAttempts: 0,
    soundOnSuccess: true,
    notifyOnSuccess: true,
  }
}

function optionsFromSettings(s: AppSettings): BookingOptions {
  return {
    seatPreference: s.seatPreference,
    allowWaitingList: s.allowWaitingList,
    continueAfterWaitlist: s.continueAfterWaitlist,
    intervalSec: s.intervalMs / 1000,
    jitterSec: s.jitterMs / 1000,
    maxAttempts: s.maxAttempts,
    soundOnSuccess: s.soundOnSuccess,
    notifyOnSuccess: s.notifyOnSuccess,
  }
}

function formFromLastSearch(last: NonNullable<AppSettings['lastSearch']>, base: SearchFormValue): SearchFormValue {
  const toClock = (t?: string): string | undefined => {
    if (!t) return undefined
    const c = t.replace(':', '')
    return c.length >= 4 ? `${c.slice(0, 2)}:${c.slice(2, 4)}` : undefined
  }
  const date = last.date ? compactToISO(last.date.replace(/-/g, '')) : base.date
  return {
    dep: last.dep ?? base.dep,
    arr: last.arr ?? base.arr,
    // Never restore a date in the past.
    date: date >= todayISO() ? date : todayISO(),
    timeFrom: toClock(last.timeFrom) ?? base.timeFrom,
    timeTo: toClock(last.timeTo) ?? base.timeTo,
    categories: Array.isArray(last.categories) ? last.categories : base.categories,
    passengers: last.passengers ? { ...base.passengers, ...last.passengers } : base.passengers,
  }
}

function toSearchRequest(form: SearchFormValue): SearchRequest {
  // Clamp to today so a window left open past midnight can't submit a past (dead) date.
  const date = form.date >= todayISO() ? form.date : todayISO()
  return {
    dep: form.dep.trim(),
    arr: form.arr.trim(),
    date: isoToCompact(date),
    timeFrom: form.timeFrom.replace(':', ''),
    timeTo: form.timeTo.replace(':', ''),
    categories: form.categories,
    passengers: form.passengers,
  }
}

export default function App(): JSX.Element {
  const [session, setSession] = useState<SessionInfo>({ loggedIn: false })
  const [savedLogin, setSavedLogin] = useState<SavedLogin | null>(null)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [stations, setStations] = useState<string[]>([])
  const [form, setForm] = useState<SearchFormValue>(defaultForm)
  const [options, setOptions] = useState<BookingOptions>(defaultOptions)
  const [trains, setTrains] = useState<Train[]>([])
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [searching, setSearching] = useState(false)
  const [searchedOnce, setSearchedOnce] = useState(false)
  const [booking, setBooking] = useState<BookingState>(IDLE_STATE)
  const [logs, setLogs] = useState<IdLogEntry[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [reservationsBusy, setReservationsBusy] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ text: string; kind: 'error' | 'info' } | null>(null)
  const prevStatus = useRef<BookingState['status']>('idle')
  const prevWaitlist = useRef(0)
  const toastTimer = useRef<number | null>(null)
  const logSeq = useRef(0)

  const running = booking.status === 'running'
  // What the reservation panel shows on top: a secured seat, else the latest waiting list joined this run.
  const highlight = booking.reservation ?? (booking.waitlist.length > 0 ? booking.waitlist[booking.waitlist.length - 1] : null)

  const showToast = useCallback((text: string, kind: 'error' | 'info' = 'error') => {
    setToast({ text, kind })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 5000)
  }, [])

  const pushLog = useCallback((entry: LogEntry) => {
    const withId: IdLogEntry = { ...entry, id: logSeq.current++ }
    setLogs((prev) => (prev.length >= MAX_LOGS ? [...prev.slice(prev.length - MAX_LOGS + 1), withId] : [...prev, withId]))
  }, [])

  const refreshReservations = useCallback(async () => {
    setReservationsBusy(true)
    try {
      setReservations(await korail.getReservations())
    } catch (e) {
      showToast(`예약 목록 조회 실패: ${errorMessage(e)}`)
    } finally {
      setReservationsBusy(false)
    }
  }, [showToast])

  // Bootstrap: session, settings, stations, current engine state.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [s, info, st, names, bs, saved] = await Promise.all([
          korail.getSession(),
          korail.getAppInfo(),
          korail.getSettings(),
          korail.getStations(),
          korail.getBookingState(),
          korail.getSavedLogin(),
        ])
        if (cancelled) return
        setSession(s)
        setAppInfo(info)
        setStations(names)
        setBooking(bs)
        // The engine lives in the main process and survives renderer reloads; seed prevStatus so a
        // hydrated 'success' state is not replayed as a live transition (chime + refresh).
        prevStatus.current = bs.status
        prevWaitlist.current = bs.waitlist.length
        setSavedLogin(saved)
        setOptions(optionsFromSettings(st))
        if (st.lastSearch) setForm((f) => formFromLastSearch(st.lastSearch!, f))
      } catch (e) {
        if (!cancelled) showToast(errorMessage(e))
      }
    })()
    const offLog = korail.onLog(pushLog)
    const offState = korail.onState(setBooking)
    return () => {
      cancelled = true
      offLog()
      offState()
    }
  }, [pushLog, showToast])

  // Side effects when the engine reaches "success".
  useEffect(() => {
    if (prevStatus.current !== 'success' && booking.status === 'success') {
      if (options.soundOnSuccess) playSuccessChime()
      void refreshReservations()
    }
    prevStatus.current = booking.status
  }, [booking.status, options.soundOnSuccess, refreshReservations])

  // A waiting list joined mid-run is worth the same chime and a refreshed reservation list.
  useEffect(() => {
    if (booking.waitlist.length > prevWaitlist.current) {
      if (options.soundOnSuccess) playSuccessChime()
      void refreshReservations()
    }
    prevWaitlist.current = booking.waitlist.length
  }, [booking.waitlist.length, options.soundOnSuccess, refreshReservations])

  // Keep the table in sync with what the engine last saw.
  useEffect(() => {
    if (booking.status === 'running' && booking.trains.length > 0) setTrains(booking.trains)
  }, [booking.trains, booking.status])

  useEffect(() => {
    if (session.loggedIn) void refreshReservations()
  }, [session.loggedIn, refreshReservations])

  const login = useCallback(
    async (id: string, password: string, remember: boolean) => {
      setAuthBusy(true)
      setAuthError(null)
      try {
        const result = await korail.login(id, password, remember)
        setSession({ loggedIn: true, name: result.name, membershipNumber: result.membershipNumber, email: result.email })
        setSavedLogin(await korail.getSavedLogin())
        pushLog({ ts: Date.now(), level: 'success', message: `로그인 성공: ${result.name ?? ''} (${result.membershipNumber ?? ''})` })
        if (result.message) showToast(result.message, 'info')
      } catch (e) {
        setAuthError(errorMessage(e))
      } finally {
        setAuthBusy(false)
      }
    },
    [pushLog, showToast],
  )

  const loginWithSaved = useCallback(async () => {
    setAuthBusy(true)
    setAuthError(null)
    try {
      const result = await korail.loginWithSaved()
      setSession({ loggedIn: true, name: result.name, membershipNumber: result.membershipNumber, email: result.email })
      pushLog({ ts: Date.now(), level: 'success', message: `로그인 성공: ${result.name ?? ''} (${result.membershipNumber ?? ''})` })
    } catch (e) {
      setAuthError(errorMessage(e))
    } finally {
      setAuthBusy(false)
    }
  }, [pushLog])

  const clearSaved = useCallback(async () => {
    await korail.clearSavedLogin()
    setSavedLogin(null)
  }, [])

  const logout = useCallback(async () => {
    try {
      await korail.logout()
    } finally {
      setSession({ loggedIn: false })
      setTrains([])
      setSelected(new Set())
      setReservations([])
      setBooking(IDLE_STATE)
      pushLog({ ts: Date.now(), level: 'info', message: '로그아웃했습니다.' })
    }
  }, [pushLog])

  const search = useCallback(async () => {
    setSearching(true)
    try {
      const req = toSearchRequest(form)
      const result = await korail.searchTrains(req)
      setTrains(result)
      setSearchedOnce(true)
      setSelected((prev) => new Set([...prev].filter((k) => result.some((t) => t.key === k))))
      pushLog({
        ts: Date.now(),
        level: 'info',
        message: `열차 조회: ${req.dep} → ${req.arr} ${form.date} ${form.timeFrom}~${form.timeTo} — ${result.length}편`,
      })
    } catch (e) {
      showToast(`조회 실패: ${errorMessage(e)}`)
    } finally {
      setSearching(false)
    }
  }, [form, pushLog, showToast])

  const start = useCallback(async () => {
    const req = toSearchRequest(form)
    // A designated train only gets booked if the search window can actually fetch it; the engine
    // never scans outside timeFrom..timeTo. Refuse to start on a target outside the window rather
    // than polling forever for a train that can never appear.
    const targetKeys = [...selected].filter((k) => trains.some((t) => t.key === k && inWindow(t, form.timeFrom, form.timeTo)))
    if (selected.size > targetKeys.length) {
      showToast('선택한 열차 중 일부가 조회 시간대 밖입니다. 시간대를 넓히거나 다시 조회한 뒤 선택하세요.')
      return
    }
    const config: BookingConfig = {
      ...req,
      targetTrainKeys: targetKeys,
      seatPreference: options.seatPreference,
      allowWaitingList: options.allowWaitingList,
      continueAfterWaitlist: options.continueAfterWaitlist,
      intervalMs: Math.round(options.intervalSec * 1000),
      jitterMs: Math.round(options.jitterSec * 1000),
      maxAttempts: options.maxAttempts,
    }
    try {
      await korail.saveSettings({ soundOnSuccess: options.soundOnSuccess, notifyOnSuccess: options.notifyOnSuccess })
      setBooking(await korail.startBooking(config))
    } catch (e) {
      showToast(errorMessage(e))
    }
  }, [form, selected, trains, options, showToast])

  // Editing the route/date invalidates the previously searched train list and selection.
  const onFormChange = useCallback(
    (next: SearchFormValue) => {
      setForm((prev) => {
        if (next.dep !== prev.dep || next.arr !== prev.arr || next.date !== prev.date) {
          setTrains([])
          setSearchedOnce(false)
          setSelected(new Set())
        }
        return next
      })
    },
    [],
  )

  const stop = useCallback(async () => {
    try {
      setBooking(await korail.stopBooking())
    } catch (e) {
      showToast(errorMessage(e))
    }
  }, [showToast])

  const cancelReservation = useCallback(
    async (rsv: Reservation) => {
      const kind = rsv.waiting ? '예약대기' : '예약'
      if (!window.confirm(`${kind}번호 ${rsv.rsvId} (${rsv.trainTypeName} ${rsv.trainNo}편)을 취소할까요?`)) return
      setReservationsBusy(true)
      try {
        await korail.cancelReservation(rsv)
        pushLog({ ts: Date.now(), level: 'warn', message: `${kind} 취소: ${rsv.rsvId}` })
        await refreshReservations()
        if (booking.reservation?.rsvId === rsv.rsvId) setBooking((b) => ({ ...b, status: b.status === 'success' ? 'idle' : b.status, reservation: null }))
        if (booking.waitlist.some((w) => w.rsvId === rsv.rsvId)) setBooking(await korail.forgetWaitlist(rsv.rsvId))
      } catch (e) {
        showToast(`예약 취소 실패: ${errorMessage(e)}`)
      } finally {
        setReservationsBusy(false)
      }
    },
    [booking.reservation?.rsvId, booking.waitlist, pushLog, refreshReservations, showToast],
  )

  const toggleSelected = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const visibleTrains = useMemo(
    () => trains.filter((t) => inWindow(t, form.timeFrom, form.timeTo)),
    [trains, form.timeFrom, form.timeTo],
  )
  const eligibleCount = useMemo(
    () => visibleTrains.filter((t) => matchesCategory(t, form.categories)).length,
    [visibleTrains, form.categories],
  )
  const selectedInView = useMemo(() => [...selected].filter((k) => visibleTrains.some((t) => t.key === k)).length, [selected, visibleTrains])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            KR
          </span>
          <div>
            <h1>코레일 자동예매</h1>
            <p>지정한 날짜·시간대의 빈 좌석을 자동으로 잡습니다</p>
          </div>
        </div>
        <div className="topbar-right">
          {session.loggedIn ? (
            <>
              <div className="session">
                <strong>{session.name}</strong>
                <span>{session.membershipNumber}</span>
              </div>
              <button type="button" className="btn ghost" onClick={() => void logout()} disabled={running}>
                로그아웃
              </button>
            </>
          ) : (
            <span className="muted">로그인이 필요합니다</span>
          )}
        </div>
      </header>

      {!session.loggedIn ? (
        <main className="center">
          <LoginCard
            savedLogin={savedLogin}
            busy={authBusy}
            error={authError}
            onLogin={login}
            onLoginSaved={loginWithSaved}
            onClearSaved={clearSaved}
          />
        </main>
      ) : (
        <main className="layout">
          <aside className="sidebar">
            <SearchForm value={form} onChange={onFormChange} stations={stations} onSearch={() => void search()} searching={searching} disabled={running} />
            <BookingControls
              options={options}
              onChange={setOptions}
              running={running}
              status={booking.status}
              canStart={session.loggedIn && !searching}
              selectedCount={selectedInView}
              eligibleCount={eligibleCount}
              onStart={() => void start()}
              onStop={() => void stop()}
            />
          </aside>
          <section className="content">
            <StatusBar state={booking} />
            {highlight && (
              <ReservationPanel
                highlight={highlight}
                stillSearching={!booking.reservation && running}
                reservations={reservations}
                busy={reservationsBusy}
                onRefresh={() => void refreshReservations()}
                onCancel={(r) => void cancelReservation(r)}
                onOpenKorail={() => void korail.openExternal('https://www.letskorail.com/')}
              />
            )}
            <TrainTable
              trains={visibleTrains}
              searched={searchedOnce}
              selected={selected}
              onToggle={toggleSelected}
              onSelectKeys={(keys) => setSelected(new Set(keys))}
              categories={form.categories}
              seatPreference={options.seatPreference}
              allowWaitingList={options.allowWaitingList}
              running={running}
            />
            <LogPanel logs={logs} onClear={() => setLogs([])} />
            {!highlight && (
              <ReservationPanel
                highlight={null}
                reservations={reservations}
                busy={reservationsBusy}
                onRefresh={() => void refreshReservations()}
                onCancel={(r) => void cancelReservation(r)}
                onOpenKorail={() => void korail.openExternal('https://www.letskorail.com/')}
              />
            )}
          </section>
        </main>
      )}

      <footer className="statusline">
        <span>
          코레일+ API · {appInfo?.host ?? ''} · v{appInfo?.version ?? ''}
        </span>
        <span>예약 후 결제는 코레일+ 앱에서 결제기한 내에 직접 진행하세요. 예약대기는 좌석이 배정된 뒤에 결제합니다.</span>
      </footer>

      {toast && (
        <div className={`toast ${toast.kind}`} role="alert">
          {toast.text}
        </div>
      )}
    </div>
  )
}
