import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

/**
 * CI runners and some sandboxes ship a pre-installed Chromium rather than the
 * build this Playwright version would download. Use it when it is there.
 */
const bundledChromium = '/opt/pw-browsers/chromium'
const launch = existsSync(bundledChromium) ? { executablePath: bundledChromium } : {}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : 'html',
  use: {
    baseURL: 'http://localhost:4173/yahrah/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'phone',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: false,
        launchOptions: launch,
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions: launch },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173/yahrah/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
