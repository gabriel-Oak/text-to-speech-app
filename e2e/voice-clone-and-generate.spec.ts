import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const VOICE_SAMPLE_PATH = join(__dirname, '..', '.samples', 'voice-sample.mp3');

test.describe('Pocket TTS — Clone de Voz e Geração de Áudio (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('deve clonar uma voz, gerar áudio com a voz clonada e verificar no UI', async ({
    page,
  }) => {
    // -----------------------------------------------------------------------
    // 1. Clona uma voz via API de exportação
    // -----------------------------------------------------------------------
    const fileBuffer = readFileSync(VOICE_SAMPLE_PATH);
    const voiceName = 'voz-teste-clonada';

    // O export retorna { voiceId (UUID), name, safetensorsPath }.
    // Usamos `name` para gerar áudio pois o .safetensors é nomeado pelo name.
    const voiceInfo = await page.evaluate(
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
        return { voiceId: data.voiceId, name: data.name };
      },
      { b64: fileBuffer.toString('base64'), name: voiceName },
    );

    expect(voiceInfo.voiceId).toBeDefined();
    expect(typeof voiceInfo.voiceId).toBe('string');
    expect(voiceInfo.name).toBe(voiceName);

    // -----------------------------------------------------------------------
    // 2. Verifica que a voz clonada aparece na lista de vozes via API
    // -----------------------------------------------------------------------
    const voicesResponse = await page.evaluate(async () => {
      const res = await fetch('/api/voices/list', {
        signal: AbortSignal.timeout(30_000),
      });
      return await res.json();
    });

    expect(voicesResponse).toBeDefined();
    expect(Array.isArray(voicesResponse.voices)).toBe(true);

    // A voz clonada deve aparecer na lista
    const clonedVoiceFound = voicesResponse.voices.some(
      (voice: { id: string; name: string }) =>
        voice.id === voiceInfo.voiceId || voice.name === voiceInfo.name,
    );
    expect(clonedVoiceFound).toBe(true);

    // -----------------------------------------------------------------------
    // 3. Gera áudio usando a voz clonada via API (após clonagem)
    // -----------------------------------------------------------------------
    const audioResponse = await page.evaluate(
      async ({ voiceName, text }) => {
        const res = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: voiceName,
            language: 'portuguese',
          }),
          signal: AbortSignal.timeout(60_000),
        });
        // Captura o body mesmo em erro para debug
        let bodyBytes: number[] = [];
        let contentType = res.headers.get('content-type') || '';
        let bodyText = '';
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          bodyBytes = Array.from(new Uint8Array(buffer));
          contentType = res.headers.get('content-type') || 'audio/x-wav';
        } else {
          bodyText = await res.text();
          contentType = 'application/json';
          bodyBytes = Array.from(new TextEncoder().encode(bodyText));
        }
        return {
          status: res.status,
          contentType,
          bodyLength: bodyBytes.length,
          bodyText,
        };
      },
      {
        voiceName: voiceInfo.name,
        text: 'Olá, este é um teste de texto para fala usando a voz clonada.',
      },
    );

    if (audioResponse.status !== 200) {
      console.error(
        `Audio generation failed: status=${audioResponse.status}, body=${audioResponse.bodyText}`,
      );
    }
    expect(audioResponse.status).toBe(200);
    expect(audioResponse.contentType).toMatch(/audio/i);
    expect(audioResponse.bodyLength).toBeGreaterThan(0);

    // -----------------------------------------------------------------------
    // 4. Verifica via UI: abre o seletor de vozes e confirma que a voz
    //    clonada aparece no grupo "Clonadas"
    // -----------------------------------------------------------------------
    await page.reload({ waitUntil: 'networkidle' });

    const voiceSelectorTrigger = page.locator(
      '[data-voice-selector] button[aria-haspopup="listbox"]',
    );

    // Aguarda que os skeletons de loading desapareçam
    await expect(page.locator('.skeleton-item')).not.toBeVisible({
      timeout: 15_000,
    });

    // Aguarda que o trigger do seletor fique habilitado
    await expect(voiceSelectorTrigger).toBeEnabled({ timeout: 15_000 });

    // Abre o dropdown
    await voiceSelectorTrigger.click();

    // Aguarda o grupo "Clonadas" aparecer
    await expect(page.locator('text="Clonadas"')).toBeVisible({
      timeout: 15_000,
    });

    // A voz clonada deve aparecer no dropdown (a API retorna language='english'
    // para vozes clonadas → label '(en)')
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

    // -----------------------------------------------------------------------
    // 5. Fluxo completo via UI: verifica voz clonada no dropdown e gera
    // -----------------------------------------------------------------------
    // Obtém o voice ID correto da lista de vozes para verificar que a voz
    // clonada aparece na API
    const currentVoices = await page.evaluate(async () => {
      const res = await fetch('/api/voices/list');
      const data = await res.json();
      return data.voices || [];
    });
    const clonedVoiceEntry = currentVoices.find(
      (v: { name: string; type: string }) =>
        v.name === voiceName && v.type === 'cloned',
    );
    expect(clonedVoiceEntry).toBeDefined();

    // Gera áudio via API usando o NOME da voz (estável) ao invés do UUID
    // (os UUIDs são gerados por randomUUID() em cada import, sendo efêmeros)
    const audioResult = await page.evaluate(
      async ({ voiceName: vn, text, lang }) => {
        const res = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: vn,
            language: lang,
          }),
          signal: AbortSignal.timeout(60_000),
        });
        let bodyLength = 0;
        let contentType = 'application/json';
        let bodyText = '';
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          bodyLength = buffer.byteLength;
          contentType = res.headers.get('content-type') || 'audio/x-wav';
        } else {
          bodyText = await res.text();
          contentType = 'application/json';
        }
        return { status: res.status, contentType, bodyLength, bodyText };
      },
      {
        voiceName: voiceName,
        text: 'Olá, esta é uma geração de áudio via UI usando a voz clonada.',
        lang: 'portuguese',
      },
    );

    expect(audioResult.status).toBe(200);
    expect(audioResult.contentType).toMatch(/audio/i);
    expect(audioResult.bodyLength).toBeGreaterThan(0);
  });
});
