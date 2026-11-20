import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

/**
 * The build environment ships its own Chromium. Use it when present (or when
 * PLAYWRIGHT_CHROMIUM_PATH points somewhere else); otherwise Playwright uses
 * the browser fetched by `npx playwright install chromium`, as in CI.
 */
const PRESET_CHROMIUM = '/opt/pw-browsers/chromium'
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ||
  (existsSync(PRESET_CHROMIUM) ? PRESET_CHROMIUM : undefined)

const PORT = 4173

/**
 * A second build with made-up Firebase settings, for the Shabd Khoj streak
 * leaderboard tests (tests/e2e/words.spec.ts). Its Firestore requests are
 * answered inside the test by tests/e2e/fake-firestore.ts; nothing is sent.
 * It never reuses a server already on its port, which would be some other
 * site: a busy port fails the run. Set E2E_FIREBASE_PORT to use another port.
 */
const FIREBASE_PORT = Number(process.env.E2E_FIREBASE_PORT) || 4180
const FIREBASE_OUT_DIR = 'node_modules/.e2e-firebase-dist'
process.env.E2E_FIREBASE_URL = `http://localhost:${FIREBASE_PORT}`

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: 'phone',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 }, hasTouch: true },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: [
    {
      command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: `npx vite build --outDir ${FIREBASE_OUT_DIR} && npx vite preview --outDir ${FIREBASE_OUT_DIR} --port ${FIREBASE_PORT} --strictPort`,
      url: `http://localhost:${FIREBASE_PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { VITE_FIREBASE_API_KEY: 'e2e-not-a-real-key', VITE_FIREBASE_PROJECT_ID: 'e2e-streaks' },
    },
  ],
})
