import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import type { AppInfo, VersionSource } from '../../../shared/types'

export interface VersionOverrides {
  appVersion: string
  appDisplayVersion: string
}

interface Props {
  info: AppInfo | null
  overrides: VersionOverrides
  /** Open the card and call out the fields (Korail just demanded an app update). */
  highlighted: boolean
  disabled: boolean
  onSave: (next: VersionOverrides) => Promise<void>
}

const SOURCE_LABELS: Record<VersionSource, string> = {
  setting: '직접 입력',
  env: '환경 변수',
  hint: '원격 안내',
  server: '코레일 서버 안내',
  default: '기본값',
}

const BUILD_REGEX = /^\d{6,12}$/
const DISPLAY_REGEX = /^\d{1,3}(\.\d{1,4}){1,3}$/

/**
 * The two 코레일+ version values Korail gates on. Hidden behind a disclosure because nobody should
 * need it until Korail ships an app update; then it is the way to keep going without a new build.
 */
export function VersionSettings({ info, overrides, highlighted, disabled, onSave }: Props): JSX.Element {
  const [appVersion, setAppVersion] = useState(overrides.appVersion)
  const [appDisplayVersion, setAppDisplayVersion] = useState(overrides.appDisplayVersion)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setAppVersion(overrides.appVersion)
    setAppDisplayVersion(overrides.appDisplayVersion)
  }, [overrides.appVersion, overrides.appDisplayVersion])

  useEffect(() => {
    if (highlighted) setOpen(true)
  }, [highlighted])

  const buildOk = appVersion === '' || BUILD_REGEX.test(appVersion.trim())
  const displayOk = appDisplayVersion === '' || DISPLAY_REGEX.test(appDisplayVersion.trim())
  const dirty = appVersion !== overrides.appVersion || appDisplayVersion !== overrides.appDisplayVersion

  const save = async (next: VersionOverrides): Promise<void> => {
    setBusy(true)
    try {
      await onSave(next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className={`card advanced${highlighted ? ' highlighted' : ''}`} open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>코레일+ 앱 버전 값 (고급)</summary>
      <p className="hint">
        코레일은 오래된 앱 버전의 요청을 거부합니다. 코레일+ 앱이 업데이트되어 &quot;앱 업데이트를 요구합니다&quot;가 나오면 Play 스토어의 최신 코레일+ 버전을
        아래에 넣으세요. 비워 두면 내장값(또는 원격 안내)을 씁니다.
      </p>
      {info && (
        <p className="hint version-current">
          현재 사용 중: Version <code>{info.apiVersion}</code> ({SOURCE_LABELS[info.apiVersionSource]}) · AppVersion <code>{info.appDisplayVersion}</code> (
          {SOURCE_LABELS[info.appDisplayVersionSource]})
        </p>
      )}
      <label className="field">
        <span>AppVersion — 코레일+ 스토어 버전 (예: {info?.defaultAppDisplayVersion ?? '7.0.10'})</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder={info?.defaultAppDisplayVersion ?? ''}
          value={appDisplayVersion}
          onChange={(e) => setAppDisplayVersion(e.target.value.replace(/[^\d.]/g, '').slice(0, 16))}
          disabled={disabled || busy}
          aria-label="코레일+ AppVersion 값"
          aria-invalid={!displayOk}
        />
      </label>
      <label className="field">
        <span>Version — 내부 빌드 번호 (예: {info?.defaultApiVersion ?? '250722001'}, 보통 그대로 둠)</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder={info?.defaultApiVersion ?? ''}
          value={appVersion}
          onChange={(e) => setAppVersion(e.target.value.replace(/\D/g, '').slice(0, 12))}
          disabled={disabled || busy}
          aria-label="코레일+ Version 값"
          aria-invalid={!buildOk}
        />
      </label>
      {(!buildOk || !displayOk) && <div className="alert warn">형식을 확인하세요. AppVersion은 7.0.10 처럼, Version은 숫자 9자리입니다.</div>}
      <div className="actions row">
        <button
          type="button"
          className="btn primary"
          onClick={() => void save({ appVersion: appVersion.trim(), appDisplayVersion: appDisplayVersion.trim() })}
          disabled={disabled || busy || !dirty || !buildOk || !displayOk}
        >
          버전 값 저장
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => void save({ appVersion: '', appDisplayVersion: '' })}
          disabled={disabled || busy || (overrides.appVersion === '' && overrides.appDisplayVersion === '')}
        >
          기본값으로
        </button>
      </div>
    </details>
  )
}
