import { defineConfig } from '@playwright/test';

// Browser testing is a CI-only development tool. It is not a site dependency
// and is never copied into the static publication outputs.
export default defineConfig({
  testDir: './browser-tests',
  testMatch: '**/*.spec.mjs',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  expect: { timeout: 5000 },
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } }
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://127.0.0.1:4173/preview/index.html',
    env: { PORT: '4173' },
    reuseExistingServer: false,
    timeout: 15000
  }
});
