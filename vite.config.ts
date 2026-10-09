import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Must match the GitHub Pages repo path (https://carmukyo.github.io/wuwaC/).
const BASE = '/wuwaC/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    // Offline support + update prompt for the hosted build. The service
    // worker is build-only (devOptions off), so `npm run dev` and Vitest are
    // unaffected. encore.moe is deliberately NOT cached here — the snapshot
    // cache in IndexedDB (data/activeSnapshot.ts) owns that.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      devOptions: { enabled: false },
      manifest: {
        name: 'WuWa Optimizer',
        short_name: 'WuWa Opt',
        description: 'Local-first Echo inventory and damage optimizer for Wuthering Waves.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#fbf4f1',
        theme_color: '#fbf4f1',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,gif}'],
        // The game-data snapshot chunk is ~2 MB; precache it so offline works.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Separate long-lived chunks so a code-only deploy doesn't make
        // returning visitors re-download the multi-MB game-data snapshot
        // (and vice versa for a data-only re-sync).
        codeSplitting: {
          groups: [
            { name: 'snapshot', test: /src[\\/]data[\\/]generated[\\/]/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./src/ui/test-setup.ts'],
        },
      },
    ],
  },
})
