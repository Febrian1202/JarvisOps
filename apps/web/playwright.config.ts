import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // sequential for golden path
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      testIgnore: /mobile-responsive\.spec\.ts/,
    },
    {
      name: 'Pixel 7',
      use: {
        ...devices['Pixel 7'],
      },
      testMatch: /mobile-responsive\.spec\.ts/,
    },
    {
      name: 'iPhone 14',
      use: {
        ...devices['iPhone 14'],
        defaultBrowserType: 'chromium',
      },
      testMatch: /mobile-responsive\.spec\.ts/,
    },
  ],
  webServer: process.env.CI
    ? {
        command: 'cd ../.. && make up',
        port: 3000,
        reuseExistingServer: true,
      }
    : undefined,
});
