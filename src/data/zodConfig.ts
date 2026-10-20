import { z } from 'zod';

// The production CSP has no 'unsafe-eval', so zod's JIT probe (`Function("")`)
// logs a CSP violation on every page load. Run zod jitless instead. zod reads
// this while it builds each object schema (at module import, not at parse), so
// this must evaluate before any schema exists: it is schema.ts's first import.
z.config({ jitless: true });
