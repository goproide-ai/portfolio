/// <reference types="vite/client" />
import type { KorailBridge } from '../../shared/types'

declare global {
  interface Window {
    korail: KorailBridge
  }
}

export {}
