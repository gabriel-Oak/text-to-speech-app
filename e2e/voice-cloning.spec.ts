import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const TTS_API_URL = 'http://localhost:8000';
const VOICE_SAMPLE_PATH = join(__dirname, '..', '.samples', 'voice-sample.mp3');

/**
 * Verifica se o Pocket TTS está rodando na porta esperada.
 */
async function isTtsServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${TTS_API_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

test.describe('Pocket TTS — Clonagem de Voz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('deve clonar uma voz, verificar sucesso e exibi-la no seletor de vozes', async ({
    page,
  }) => {
    const ttsAvailable = await isTtsServerRunning();

    // -----------------------------------------------------------------------
    // 1. Chama a API de clonagem de voz diretamente (full stack)
    // -----------------------------------------------------------------------
    const fileBuffer = readFileSync(VOICE_SAMPLE_PATH);
    const voiceName = 'voz-teste-clonada';
    const voiceId = await page.evaluate(
      async ({ b64, name }) => {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const file = new File([bytes], 'voice-sample.mp3', {
          type: 'audio/mpeg',
        });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);
        formData.append('language', 'portuguese');

        const response = await fetch('/api/tts/voice/export', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(120_000),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || `Erro ${response.status}`);
        }
        return data.voiceId;
      },
      { b64: fileBuffer.toString('base64'), name: voiceName },
    );

    expect(voiceId).toBeDefined();
    expect(typeof voiceId).toBe('string');

    // -----------------------------------------------------------------------
    // 2. Força o re-fetch da lista de vozes recarregando a página
    //    (o VoiceSelector faz fetch ao montar, então um reload garante
    //     que a voz clonada seja lida do disco)
    // -----------------------------------------------------------------------
    await page.reload({ waitUntil: 'networkidle' });

    // -----------------------------------------------------------------------
    // 3. Abre o seletor de vozes e verifica que a voz clonada aparece
    // -----------------------------------------------------------------------
    const voiceSelectorTrigger = page.locator(
      '[data-voice-selector] button[aria-haspopup="listbox"]',
    );

    // Aguarda que o VoiceSelector termine o loading (skeleton desaparece)
    await expect(
      page.locator('.skeleton-item'),
    ).not.toBeVisible({ timeout: 15_000 });

    // Aguarda que o trigger do seletor fique habilitado
    await expect(voiceSelectorTrigger).toBeEnabled({ timeout: 15_000 });

    // Abre o dropdown
    await voiceSelectorTrigger.click();

    // Aguarda o grupo "Clonadas" aparecer
    await expect(
      page.locator('text="Clonadas"'),
    ).toBeVisible({ timeout: 15_000 });

    // Verifica que a voz clonada aparece na lista do dropdown
    // (a API retorna language='english' para vozes clonadas → label '(en)')
    const clonedVoiceLabel = `${voiceName} (en)`;
    await expect(
      page.locator(
        `[role="listbox"] [role="option"]:has-text("${clonedVoiceLabel}")`,
      ),
    ).toBeVisible({ timeout: 10_000 });

    // Verifica que a opção tem o estilo de voz clonada
    const clonedOption = page.locator(
      `[role="listbox"] [role="option"]:has-text("${clonedVoiceLabel}")`,
    );
    await expect(clonedOption).toHaveClass(/vs-option-cloned/);
  });
});
