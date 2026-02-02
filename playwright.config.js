import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const authFile = path.join(import.meta.dirname, 'e2e', '.auth', 'state.json');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Setup project - run first to save auth state
    {
      name: 'setup',
      testMatch: /auth-setup\.js/,
    },
    // Unauthenticated tests (camp discovery, accessibility)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /auth-setup\.js|schedule-planner\.spec\.js/,
    },
    // Authenticated tests (schedule planner)
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      testMatch: /schedule-planner\.spec\.js/,
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
