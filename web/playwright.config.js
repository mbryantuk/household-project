import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, 
  reporter: [['list'], ['json', { outputFile: 'test-results/smoke.json' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4001',
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    userAgent: 'Hearth-Smoke-Test', // Item 176: Custom UA for test detection
    extraHTTPHeaders: {
      'x-bypass-maintenance': 'true',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
