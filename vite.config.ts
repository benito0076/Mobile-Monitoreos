import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))

export default defineConfig({
  define: { __VERSION_APP__: JSON.stringify(version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Monitoreos de campo',
        short_name: 'Monitoreos',
        lang: 'es-CO',
        display: 'standalone',
        start_url: '/',
        background_color: '#ffffff',
        theme_color: '#0b6e4f',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: { include: ['tests/**/*.test.ts'] },
})
