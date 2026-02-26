import { defineConfig, devices } from '@playwright/test'

const E2E_PORT = 5175
const baseURL = `http://localhost:${E2E_PORT}`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: (() => {
    const w = parseInt(process.env.PLAYWRIGHT_WORKERS || '', 10)
    if (Number.isNaN(w) || w < 1) return process.env.CI ? 1 : 1
    return Math.min(4, Math.max(1, w))
  })(),
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results-dashboard/playwright-results.json' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--no-proxy-server'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${E2E_PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
  timeout: 130000,
})
