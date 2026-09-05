import type { KorailBridge } from '../../../shared/types'

function missing(): never {
  throw new Error('preload 브리지(window.korail)를 찾을 수 없습니다. Electron 안에서 실행하세요.')
}

export const korail: KorailBridge =
  typeof window !== 'undefined' && window.korail
    ? window.korail
    : (new Proxy({}, { get: () => missing }) as unknown as KorailBridge)

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
  return String(e)
}
