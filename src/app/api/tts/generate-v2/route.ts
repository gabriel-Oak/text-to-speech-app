import { NextRequest, NextResponse } from 'next/server';
import FormData from 'form-data';

const TTS_SERVER_URL =
  process.env.NEXT_PUBLIC_TTS_SERVER_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 60000; // ms

/**
 * POST /api/tts/generate-v2
 *
 * Route handler com streaming para o Pocket TTS.
 * Recebe FormData com text, voice_url (ou voice_wav)
 * e retorna audio stream.
 */
export async function POST(request: NextRequest) {
  try {
    // --- Parse FormData ---
    const formData = await request.formData();
    const text = formData.get('text') as string | null;
    const voiceUrl = formData.get('voice_url') as string | null;
    const voiceWav = formData.get('voice_wav');

    // --- Validação ---
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Texto é obrigatório e não pode ser vazio' },
        { status: 400 },
      );
    }

    if (!voiceUrl && !voiceWav) {
      return NextResponse.json(
        { error: 'voice_url ou voice_wav é obrigatório' },
        { status: 400 },
      );
    }

    // --- Construir body multipart usando form-data (biblioteca Node.js) ---
    // Isso garante que o formato multipart seja exatamente o esperado
    // pelo servidor Pocket TTS (mesmo formato que curl usa).
    const form = new FormData();
    form.append('text', text.trim());

    if (voiceWav && voiceWav instanceof File) {
      // Clonagem de voz: envia o arquivo binário
      const wavFile = voiceWav as File;
      const buffer = Buffer.from(await wavFile.arrayBuffer());
      form.append('voice_wav', buffer, {
        filename: wavFile.name,
        contentType: wavFile.type || 'application/octet-stream',
      });
    } else if (voiceUrl) {
      // Voz builtin/custom: envia o nome da voz
      form.append('voice_url', voiceUrl);
    }

    // --- Forward para Pocket TTS ---
    const ttsUrl = `${TTS_SERVER_URL}/tts`;

    const response = await fetch(ttsUrl, {
      method: 'POST',
      body: form.getBuffer(),
      headers: form.getHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `Erro no servidor TTS: ${errorBody}` },
        { status: response.status },
      );
    }

    const audioContentType =
      response.headers.get('content-type') || 'audio/x-wav';

    // --- Stream direto (sem buffer) ---
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': audioContentType,
        'Content-Disposition': 'attachment; filename="tts-output.wav"',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Tempo limite excedido (60s). O texto pode ser muito longo.' },
        { status: 504 },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Erro interno no servidor',
      },
      { status: 500 },
    );
  }
}
