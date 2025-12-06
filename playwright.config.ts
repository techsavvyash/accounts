import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for E2E tests
 * Tests the Accounts Management API with Heimdall authentication
 */
export default defineConfig({
  testDir: './tests',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html'],
    ['list']
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL for the API
    baseURL: process.env.API_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },

  // Configure projects for different test scenarios
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: process.env.SKIP_SERVER_START ? undefined : [
    {
      command: 'cd apps/api && bun run dev',
      url: 'http://localhost:6969/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'cd apps/web && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    }
  ],
})
