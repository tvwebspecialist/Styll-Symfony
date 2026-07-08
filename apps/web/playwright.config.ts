import { loadEnvConfig } from '@next/env'
import { defineConfig, devices } from 'playwright/test'

loadEnvConfig(process.cwd())

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const webServerPort = new URL(baseURL).port || '3000'
const webServerCommand =
  `node -e "require('node:fs').rmSync('.next-playwright',{ recursive: true, force: true })" ` +
  `&& NEXT_DIST_DIR=.next-playwright pnpm exec next dev --webpack --port ${webServerPort}`

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
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
