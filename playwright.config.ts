import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests (ADR 0012): integration tests for each story in tests/integration,
 * and end-to-end tests of the whole daily flow in tests/e2e. Unit tests stay in Vitest.
 */
export default defineConfig({
  testDir: 'tests',
  testMatch: ['integration/**/*.spec.ts', 'e2e/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    // A missing control fails as an error rather than a test timeout, which
    // test.fail does not count as the expected failure.
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
