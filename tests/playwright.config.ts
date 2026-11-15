import { defineConfig } from '@playwright/test';

/**
 * DigiHisab E2E Playwright Configuration (Inside /tests)
 * Enables seamless execution whether running from root or from within the tests directory.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.SUPERADMIN_URL || 'http://localhost:3000',
    channel: 'msedge',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'msedge',
      use: {
        channel: 'msedge',
      },
    },
  ],
});
