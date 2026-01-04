import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,  // Run tests sequentially to avoid rate limiting
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,  // Single worker to prevent rate limiting
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run server',
      url: 'http://localhost:3001/api/stats',
      reuseExistingServer: true,  // Always reuse if running
      timeout: 120 * 1000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:8080',
      reuseExistingServer: true,  // Always reuse if running
      timeout: 120 * 1000,
    },
  ],
});
