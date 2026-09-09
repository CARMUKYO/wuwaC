// Vitest setup: custom matchers (toBeInTheDocument, …) for UI tests.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Without `globals: true`, Testing Library cannot auto-register cleanup —
// do it explicitly so each test gets a fresh document.
afterEach(() => {
  cleanup();
});
