import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config para E2E tests do Pocket TTS.
 *
 * Execução:
 *   npx playwright test               (todos os testes)
 *   npx playwright test e2e/          (apenas e2e)
 *   npx playwright test --headed      (modo visível)
 *   npx playwright test --debug       (modo debug)
 *
 * O Pocket TTS server é iniciado em paralelo com o Next.js dev server.
 */
export default defineConfig({
  testDir: 'e2e',
  // logLevel removed — causes type error in newer Playwright versions
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
      },
    },
  ],
  // Inicia o Pocket TTS e o Next.js dev server antes dos testes
  webServer: {
    command:
      'python3 -m pocket_tts serve --host 0.0.0.0 --port 8000 >/dev/null 2>&1 & ' +
      'NEXT_PUBLIC_TTS_SERVER_URL=http://localhost:8000 npm run dev 2>/dev/null',
    port: 3000,
    timeout: 90_000,
    reuseExistingServer: true,
  },
});
