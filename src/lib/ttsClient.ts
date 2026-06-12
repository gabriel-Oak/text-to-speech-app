import type { Voice } from '@/types/tts';
import { TTSRequest, VoiceExportRequest } from '@/types/tts';

const TTS_SERVER_URL =
  process.env.NEXT_PUBLIC_TTS_SERVER_URL || 'http://localhost:8000';

// Gera áudio a partir de texto — retorna Blob
export async function generateAudio(request: TTSRequest): Promise<Blob> {
  const formData = new FormData();
  formData.append('text', request.text);
  if (request.voice) formData.append('voice_url', request.voice);
  if (request.language) formData.append('language', request.language);

  const response = await fetch(`${TTS_SERVER_URL}/tts`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(60000),
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
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    throw new Error(`Voice export failed: ${response.statusText}`);
  }

  return response.json();
}

// Lista vozes disponíveis
export async function listVoices(): Promise<Voice[]> {
  const response = await fetch(`${TTS_SERVER_URL}/voices`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to list voices: ${response.statusText}`);
  }

  return response.json();
}
