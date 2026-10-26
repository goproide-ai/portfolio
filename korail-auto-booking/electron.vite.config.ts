import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

const shared = resolve(__dirname, 'src/shared')

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': shared } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': shared } },
  },
  renderer: {
    resolve: {
      alias: {
        '@shared': shared,
        '@renderer': resolve(__dirname, 'src/renderer/src'),
      },
    },
    // Plain CSS, no PostCSS plugins. An inline config also stops Vite from searching parent
    // directories for a postcss.config.*: this app lives inside the Next.js portfolio repo, whose
    // Tailwind PostCSS config would otherwise be picked up (and fail to load) on Windows builds.
    css: { postcss: {} },
    plugins: [react()],
  },
})
