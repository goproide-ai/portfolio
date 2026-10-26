import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export interface Credentials {
  id: string
  password: string
}

export interface Encryptor {
  isEncryptionAvailable(): boolean
  encryptString(plain: string): Buffer
  decryptString(encrypted: Buffer): string
}

interface StoredCredentials {
  id: string
  /** base64 of safeStorage.encryptString(password) */
  password: string
}

/**
 * Remember-me storage. The password is encrypted with Electron's safeStorage
 * (OS keychain / DPAPI) before it touches the disk; the id is stored in clear.
 */
export class CredentialStore {
  private readonly file: string

  constructor(userDataDir: string, private readonly encryptor: Encryptor) {
    this.file = join(userDataDir, 'credentials.json')
  }

  canRemember(): boolean {
    try {
      return this.encryptor.isEncryptionAvailable()
    } catch {
      return false
    }
  }

  save(creds: Credentials): boolean {
    if (!this.canRemember()) return false
    const payload: StoredCredentials = {
      id: creds.id,
      password: this.encryptor.encryptString(creds.password).toString('base64'),
    }
    mkdirSync(dirname(this.file), { recursive: true })
    writeFileSync(this.file, JSON.stringify(payload), { encoding: 'utf8', mode: 0o600 })
    return true
  }

  /** Returns the saved id without decrypting the password. */
  peekId(): string | null {
    const stored = this.read()
    return stored ? stored.id : null
  }

  load(): Credentials | null {
    const stored = this.read()
    if (!stored || !this.canRemember()) return null
    try {
      return { id: stored.id, password: this.encryptor.decryptString(Buffer.from(stored.password, 'base64')) }
    } catch {
      return null
    }
  }

  clear(): void {
    try {
      rmSync(this.file, { force: true })
    } catch {
      // ignore
    }
  }

  private read(): StoredCredentials | null {
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<StoredCredentials>
      if (typeof parsed.id === 'string' && typeof parsed.password === 'string') return parsed as StoredCredentials
    } catch {
      // missing or corrupt file
    }
    return null
  }
}
