import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    clearMocks: true,
    restoreMocks: true,
    // Playwright runs the browser tests (ADR 0012).
    exclude: [...configDefaults.exclude, 'tests/integration/**', 'tests/e2e/**'],
  },
});
