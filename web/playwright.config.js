import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }], 
    ['json', { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME || 'test-results/results.json' }]
  ],
  use: {
    // Target the production/container port by default, or override with BASE_URL env
    baseURL: process.env.BASE_URL || 'http://localhost:4001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* 
     We only use webServer for local dev testing. 
     CI/Deploy scripts will target the already running containers.
  */
  webServer: process.env.CI_TEST ? undefined : [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
    {
      command: 'cd ../server && node server.js',
      url: 'http://localhost:4001/api/auth/profile',
      reuseExistingServer: true,
      env: {
        NODE_ENV: 'test',
        PORT: '4001'
      }
    }
  ],
});