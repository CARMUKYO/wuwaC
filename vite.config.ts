import { createReadStream, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Must match the GitHub Pages repo path (https://carmukyo.github.io/wuwaC/).
const BASE = '/wuwaC/'

const require = createRequire(import.meta.url)
const TESSERACT_VERSION = (JSON.parse(readFileSync(require.resolve('tesseract.js/package.json'), 'utf8')) as { version: string }).version
/** Versioned so the CacheFirst route below can never mix two releases. */
const OCR_DIR = `ocr/${TESSERACT_VERSION}/`

/**
 * Echo scanner OCR runtime, self-hosted under `<base>ocr/<version>/` so scanning
 * works offline and never touches a CDN (tesseract.js defaults to
 * jsdelivr). Served from node_modules in dev, emitted as assets in build.
 * Only the LSTM core variants are shipped (the scanner runs OEM 1); the
 * browser fetches exactly one of the three. `eng` is the 4.0.0 best_int
 * model the Phase 0 evaluation used (scripts/scan-eval.ts).
 */
const OCR_ASSETS: Record<string, string> = {
  'worker.min.js': require.resolve('tesseract.js/dist/worker.min.js'),
  'tesseract-core-relaxedsimd-lstm.wasm.js': require.resolve('tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js'),
  'tesseract-core-simd-lstm.wasm.js': require.resolve('tesseract.js-core/tesseract-core-simd-lstm.wasm.js'),
  'tesseract-core-lstm.wasm.js': require.resolve('tesseract.js-core/tesseract-core-lstm.wasm.js'),
  'eng.traineddata.gz': require.resolve('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'),
}

function ocrAssets(): Plugin {
  return {
    name: 'wuwa-ocr-assets',
    configureServer(server) {
      server.middlewares.use(`${BASE}${OCR_DIR}`, (req, res, next) => {
        const source = OCR_ASSETS[(req.url ?? '').replace(/^\//, '').split('?')[0]]
        if (source === undefined) return next()
        res.setHeader('Content-Type', source.endsWith('.gz') ? 'application/octet-stream' : 'text/javascript')
        createReadStream(source).pipe(res)
      })
    },
    generateBundle() {
      for (const [name, source] of Object.entries(OCR_ASSETS)) {
        this.emitFile({ type: 'asset', fileName: `${OCR_DIR}${name}`, source: readFileSync(source) })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  define: {
    // Consumed by src/scanner/engine.ts (declared in src/vite-env.d.ts).
    __WUWA_OCR_DIR__: JSON.stringify(OCR_DIR),
  },
  plugins: [
    react(),
    tailwindcss(),
    ocrAssets(),
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
        // ~7 MB of OCR runtime: never precached (most visitors never scan);
        // cached on first scan by the `wuwa-ocr` route below instead.
        globIgnores: ['ocr/**'],
        // The game-data snapshot chunk is ~2 MB; precache it so offline works.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Echo scanner OCR runtime (same-origin, version in the path).
            // tesseract.js's own IndexedDB cache is disabled in
            // scanner/engine.ts — its store name is unprefixed.
            urlPattern: ({ url }) => url.pathname.startsWith(`${BASE}ocr/`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'wuwa-ocr',
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 10 },
            },
          },
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
            // tesseract.js (+ its deps) stays out of `vendor`: only the
            // lazily imported scanner engine needs it, so it rides in that
            // chunk and visitors who never scan never download it.
            { name: 'vendor', test: /node_modules[\\/](?!(?:tesseract\.js|bmp-js|idb-keyval|is-url|regenerator-runtime|wasm-feature-detect|zlibjs)[\\/])/ },
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
