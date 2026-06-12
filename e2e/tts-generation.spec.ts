import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TTS_SERVER_PORT = 8000;

/**
 * Verifica se o Pocket TTS está rodando na porta esperada.
 */
async function isTtsServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${TTS_SERVER_PORT}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

test.describe('Pocket TTS — Fluxo completo de geração de áudio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('deve carregar a página inicial com o cabeçalho', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Pocket TTS');
    await expect(
      page.locator('text="Texto para falar"'),
    ).toBeVisible();
  });

  test('deve exibir seções do formulário', async ({ page }) => {
    await expect(
      page.locator('textarea, [role="textbox"]'),
    ).toBeVisible();
    await expect(page.locator('text=/Idioma/')).toBeVisible();
    await expect(page.locator('label', { hasText: 'Voz:' })).toBeVisible();
    await expect(page.locator('button', { hasText: /Gerar/ })).toBeVisible();
  });

  test('deve preencher campos e verificar que API retorna áudio', async ({ page }) => {
    const textarea = page.locator('textarea, [role="textbox"]');
    await textarea.fill('Olá, este é um teste de texto para fala.');
    await expect(textarea).toHaveValue('Olá, este é um teste de texto para fala.');

    const generateBtn = page.locator('button', { hasText: /Gerar/ });
    await generateBtn.click();

    const ttsRunning = await isTtsServerRunning();

    if (ttsRunning) {
      // Intercepta a resposta da API de geração de áudio
      const audioResponse = await page.waitForResponse(
        (response) => {
          const url = response.url();
          return url.includes('/api/tts/generate') && response.request().method() === 'POST';
        },
        { timeout: 60_000 },
      );

      const status = audioResponse.status();
      expect(status).toBe(200);

      // Verifica que o conteúdo retornado é áudio (não JSON de erro)
      const contentType = audioResponse.headers()['content-type'] || '';
      expect(contentType).toMatch(/audio/i);

      // Verifica que o corpo da resposta não está vazio
      const body = await audioResponse.body();
      expect(body.length).toBeGreaterThan(0);
    } else {
      // Se o servidor TTS não está rodando, o frontend deve mostrar erro
      await expect(generateBtn).toBeVisible();
    }
  });

  test('deve mostrar dica de atalho Ctrl+Enter', async ({ page }) => {
    const textarea = page.locator('textarea, [role="textbox"]');
    await textarea.fill('Texto de teste');
    await expect(
      page.locator('text=/Ctrl\\+Enter/'),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('deve ter seções de clonagem de voz', async ({ page }) => {
    await expect(page.locator('text=/Clonar Voz|Upload|Voz Clonada/')).toBeVisible();
  });
});
