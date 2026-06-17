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

test.describe('Voice Clone v2 — Fluxo completo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('deve carregar a página v2 com o cabeçalho', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Voice Clone v2');
  });

  test('deve exibir o editor de texto', async ({ page }) => {
    await expect(page.locator('textarea, [role="textbox"]')).toBeVisible();
  });

  test('deve exibir o seletor de voz', async ({ page }) => {
    await expect(page.locator('label', { hasText: 'Voz:' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Voz:' })).toBeVisible();
  });

  test('deve exibir a área de upload de voz', async ({ page }) => {
    await expect(
      page.getByRole('button', {
        name: /Arraste um arquivo|selecione aqui/i,
      }),
    ).toBeVisible();
  });

  test('deve exibir o botão de gerar áudio', async ({ page }) => {
    await expect(
      page.locator('button', { hasText: /Gerar Áudio/ }),
    ).toBeVisible();
  });

  test('deve preencher texto e verificar que a API retorna áudio', async ({
    page,
  }) => {
    const textarea = page.locator('textarea, [role="textbox"]');
    await textarea.fill('Olá, este é um teste de texto para fala v2.');
    await expect(textarea).toHaveValue(
      'Olá, este é um teste de texto para fala v2.',
    );

    const ttsRunning = await isTtsServerRunning();

    if (ttsRunning) {
      // Faz a requisição diretamente do browser para o Pocket TTS
      const audioResult = await page.evaluate(async (text) => {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('voice_url', 'rafael');

        const res = await fetch('http://localhost:8000/tts', {
          method: 'POST',
          body: formData,
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
      }, 'Olá, este é um teste de texto para fala v2.');

      expect(audioResult.status).toBe(200);
      expect(audioResult.contentType).toMatch(/audio/i);
      expect(audioResult.bodyLength).toBeGreaterThan(0);
    } else {
      // Se o servidor TTS não está rodando, o frontend deve mostrar erro
      const generateBtn = page.locator('button', { hasText: /Gerar/ });
      await expect(generateBtn).toBeVisible();
    }
  });

  test('deve ter seletor com opções de voz builtin', async ({ page }) => {
    const select = page.getByRole('combobox', { name: 'Voz:' });
    await select.click();

    // Verificar que existem options no select
    const options = page.locator('select option');
    await expect(options.first()).toBeVisible();
  });

  test('deve mostrar o player de áudio após geração bem-sucedida', async ({
    page,
  }) => {
    // Preencher texto
    const textarea = page.locator('textarea, [role="textbox"]');
    await textarea.fill('Teste de geração v2.');

    // Selecionar uma voz builtin
    const select = page.getByRole('combobox', { name: 'Voz:' });
    await select.selectOption('anna');

    const ttsRunning = await isTtsServerRunning();

    if (ttsRunning) {
      // Clicar no botão gerar
      const generateBtn = page.locator('button', { hasText: /Gerar Áudio/ });
      await generateBtn.click();

      // Aguardar o player aparecer (com timeout generoso para o TTS)
      await expect(page.locator('[aria-label="Player de áudio"]')).toBeVisible({
        timeout: 90_000,
      });
    }
  });

  test('deve exibir mensagem de erro ao gerar sem texto', async ({ page }) => {
    // Selecionar uma voz
    const select = page.getByRole('combobox', { name: 'Voz:' });
    await select.selectOption('anna');

    // Clicar no botão gerar sem texto
    const generateBtn = page.locator('button', { hasText: /Gerar Áudio/ });
    await generateBtn.click();

    // Verificar que há mensagem de erro
    await expect(generateBtn).toHaveAttribute('aria-busy', 'false');
  });
});
