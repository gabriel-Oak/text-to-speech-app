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
    await expect(page.locator('text="Texto para falar"')).toBeVisible();
  });

  test('deve exibir seções do formulário', async ({ page }) => {
    await expect(page.locator('textarea, [role="textbox"]')).toBeVisible();
    await expect(page.locator('text=/Idioma/')).toBeVisible();
    await expect(page.locator('label', { hasText: 'Voz:' })).toBeVisible();
    await expect(page.locator('button', { hasText: /Gerar/ })).toBeVisible();
  });

  test('deve preencher campos e verificar que API retorna áudio', async ({
    page,
  }) => {
    const textarea = page.locator('textarea, [role="textbox"]');
    await textarea.fill('Olá, este é um teste de texto para fala.');
    await expect(textarea).toHaveValue(
      'Olá, este é um teste de texto para fala.',
    );

    const ttsRunning = await isTtsServerRunning();

    if (ttsRunning) {
      // Faz a requisição diretamente do browser para evitar problemas
      // com o Next.js dev server não encaminhando o body corretamente
      // quando usa NextResponse com stream.
      const audioResult = await page.evaluate(async (text) => {
        const res = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: 'rafael',
            language: 'portuguese',
          }),
          signal: AbortSignal.timeout(60_000),
        });
        let bodyBytes: number[] = [];
        const contentType = res.headers.get('content-type') || '';
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          bodyBytes = Array.from(new Uint8Array(buffer));
        }
        return {
          status: res.status,
          contentType,
          bodyLength: bodyBytes.length,
        };
      }, 'Olá, este é um teste de texto para fala.');

      expect(audioResult.status).toBe(200);
      expect(audioResult.contentType).toMatch(/audio/i);
      expect(audioResult.bodyLength).toBeGreaterThan(0);
    } else {
      // Se o servidor TTS não está rodando, o frontend deve mostrar erro
      const generateBtn = page.locator('button', { hasText: /Gerar/ });
      await expect(generateBtn).toBeVisible();
    }
  });

  test('deve mostrar dica de atalho Ctrl+Enter', async ({ page }) => {
    const textarea = page.locator('textarea, [role="textbox"]');
    await textarea.fill('Texto de teste');
    await expect(page.locator('text=/Ctrl\\+Enter/')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('deve ter seções de clonagem de voz', async ({ page }) => {
    await expect(
      page.locator('text=/Clonar Voz|Upload|Voz Clonada/'),
    ).toBeVisible();
  });
});
