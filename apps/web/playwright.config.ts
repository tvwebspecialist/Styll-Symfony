import { loadEnvConfig } from '@next/env'
import { defineConfig, devices } from 'playwright/test'

loadEnvConfig(process.cwd())

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const webServerPort = new URL(baseURL).port || '3000'
const webServerCommand =
  `pnpm exec next dev --webpack --port ${webServerPort}`
const configuredWorkers = Number.parseInt(process.env.PLAYWRIGHT_WORKERS ?? '', 10)
const workers = Number.isFinite(configuredWorkers) && configuredWorkers > 0
  ? configuredWorkers
  : 1

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers,
  outputDir: 'test-results',
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
