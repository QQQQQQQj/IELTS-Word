import { defineConfig, devices } from '@playwright/test'

const hostedBaseUrl = process.env.PLAYWRIGHT_BASE_URL
const baseURL = hostedBaseUrl ?? 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  // The full Chromium binary plus first-run vocabulary seeding is heavy;
  // keep concurrency low and allow slower first loads.
  workers: 2,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      // Use the full Chromium binary: the separate headless-shell binary is
      // blocked by this machine's execution policy.
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
    {
      name: 'webkit-iphone',
      testMatch: /(onboarding|study-modes|backup-collections|webkit-mobile)\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
    },
  ],
  ...(hostedBaseUrl
    ? {}
    : {
        webServer: {
          command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4173',
          url: 'http://127.0.0.1:4173',
          reuseExistingServer: true,
          timeout: 300_000,
        },
      }),
})
