import { TTSRequest, VoiceExportRequest, Voice } from '@/types/tts';

const TTS_SERVER_URL =
  process.env.NEXT_PUBLIC_TTS_SERVER_URL || 'http://localhost:8000';

// Gera áudio a partir de texto — retorna Blob
export async function generateAudio(request: TTSRequest): Promise<Blob> {
  const response = await fetch(`${TTS_SERVER_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: request.text,
      voice: request.voice,
      language: request.language,
    }),
    signal: AbortSignal.timeout(60000), // timeout de 60s
  });

  if (!response.ok) {
    throw new Error(`TTS generation failed: ${response.statusText}`);
  }

  return response.blob();
}

// Exporta voz clonada — file é o áudio de referência, request tem name e language
export async function exportVoice(
  file: File,
  request: VoiceExportRequest,
): Promise<{ voiceId: string; safetensorsPath: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', request.name);
  formData.append('language', request.language);

  const response = await fetch(`${TTS_SERVER_URL}/export-voice`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(120000), // timeout de 120s (clonagem pode demorar)
  });

  if (!response.ok) {
    throw new Error(`Voice export failed: ${response.statusText}`);
  }

  return response.json();
}

// Lista vozes disponíveis
export async function listVoices(): Promise<Voice[]> {
  const response = await fetch(`${TTS_SERVER_URL}/voices`, {
    signal: AbortSignal.timeout(15000), // timeout de 15s
  });

  if (!response.ok) {
    throw new Error(`Failed to list voices: ${response.statusText}`);
  }

  return response.json();
}
