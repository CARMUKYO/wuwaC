/** Versioned OCR runtime directory, e.g. "ocr/7.0.0/" (vite.config.ts `define`). */
declare const __WUWA_OCR_DIR__: string;

interface ImportMetaEnv {
  /** Build-time "moved" target (validated by `parseMovedTo` in vite.config.ts); unset on the live site. */
  readonly VITE_MOVED_TO?: string;
}
