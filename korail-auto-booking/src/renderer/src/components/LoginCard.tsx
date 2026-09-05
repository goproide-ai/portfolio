import type { JSX } from 'react'
import { useEffect, useState, type FormEvent } from 'react'
import type { SavedLogin } from '../../../shared/types'

interface Props {
  savedLogin: SavedLogin | null
  busy: boolean
  error: string | null
  onLogin: (id: string, password: string, remember: boolean) => void
  onLoginSaved: () => void
  onClearSaved: () => void
}

export function LoginCard({ savedLogin, busy, error, onLogin, onLoginSaved, onClearSaved }: Props): JSX.Element {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)

  useEffect(() => {
    if (savedLogin?.id) {
      setId(savedLogin.id)
      setRemember(true)
    }
  }, [savedLogin?.id])

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    if (busy) return
    onLogin(id, password, remember)
  }

  return (
    <form className="card login-card" onSubmit={submit}>
      <h2>코레일 회원 로그인</h2>
      <p className="muted">코레일톡과 같은 계정을 사용합니다. 입력한 정보는 코레일 서버로만 전송됩니다.</p>

      <label className="field">
        <span>회원번호 · 이메일 · 휴대폰번호</span>
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="예) 12345678 / user@example.com / 010-1234-5678"
          autoComplete="username"
          autoFocus
          required
        />
      </label>
      <label className="field">
        <span>비밀번호</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      <label className="check">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <span>로그인 정보 저장 (운영체제 보안 저장소에 암호화)</span>
      </label>

      {error && <div className="alert error">{error}</div>}

      <div className="actions">
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </button>
        {savedLogin?.hasPassword && (
          <button type="button" className="btn" onClick={onLoginSaved} disabled={busy}>
            저장된 정보로 로그인
          </button>
        )}
        {savedLogin && (
          <button type="button" className="btn ghost" onClick={onClearSaved} disabled={busy}>
            저장 정보 삭제
          </button>
        )}
      </div>
    </form>
  )
}
