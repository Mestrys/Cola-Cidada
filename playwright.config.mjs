import { defineConfig, devices } from '@playwright/test';

// Em ambientes com Chromium pré-instalado, aponte PW_CHROMIUM_PATH para ele (ex.: /opt/pw-browsers/chromium).
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: { executablePath },
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'celular', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'node server.js',
    env: { PORT: '4173' },
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
