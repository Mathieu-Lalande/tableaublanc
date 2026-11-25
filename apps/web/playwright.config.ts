import { defineConfig } from '@playwright/test'

const WEB_PORT = 5173
const API_PORT = 5858
const DATA_DIR = process.env.E2E_DATA_DIR ?? '../../.e2e-data'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: 'off' },
  webServer: [
    {
      command: 'pnpm --filter @canvas/server exec tsx src/main.ts',
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        DATA_DIR,
        PORT: String(API_PORT),
        PUBLIC_ORIGIN: `http://localhost:${WEB_PORT}`,
        AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-e2e',
        E2E_SIGNUP_CODE: 'E2E-CODE',
      },
    },
    {
      command: 'pnpm exec vite --port 5173',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
