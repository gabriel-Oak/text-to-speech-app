import { NextRequest, NextResponse } from 'next/server';

const TTS_SERVER_URL =
  process.env.NEXT_PUBLIC_TTS_SERVER_URL || 'http://localhost:8000';
const BUFFER_DURATION = 3000; // ms
const REQUEST_TIMEOUT = 60000; // ms

/**
 * Constrói o body multipart/form-data manualmente para o Pocket TTS.
 * Suporta envio via voice_url (string) ou voice_wav (arquivo binário).
 * Retorna o body como Uint8Array e o boundary usado.
 */
async function buildMultipartBody(
  text: string,
  voiceUrl: string,
  voiceWavFile?: File,
): Promise<{ body: Uint8Array; boundary: string }> {
  const boundary = `v2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const encoder = new TextEncoder();
  const footer = `\r\n--${boundary}--\r\n`;

  // --- Sem arquivo: body 100% texto ---
  if (!voiceWavFile) {
    const bodyStr =
      `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="text"\r\n\r\n' +
      text +
      '\r\n--' +
      boundary +
      '\r\n' +
      'Content-Disposition: form-data; name="voice_url"\r\n\r\n' +
      voiceUrl +
      '\r\n' +
      footer;
    return { body: encoder.encode(bodyStr), boundary };
  }

  // --- Com arquivo: body = texto + binário + footer ---
  const wavBytes = new Uint8Array(await voiceWavFile.arrayBuffer());

  // Partes textuais
  const textHeader = `--${boundary}\r\nContent-Disposition: form-data; name="text"\r\n\r\n`;
  const textBody = '\r\n';
  const urlHeader = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="voice_url"\r\n\r\n\r\n`;
  const wavHeader = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="voice_wav"; filename="input.wav"\r\nContent-Type: audio/wav\r\n\r\n`;

  // Calcular tamanho total
  const textHeaderBytes = encoder.encode(textHeader);
  const textBodyBytes = encoder.encode(textBody);
  const urlHeaderBytes = encoder.encode(urlHeader);
  const wavHeaderBytes = encoder.encode(wavHeader);
  const footerBytes = encoder.encode(footer);

  const totalLength =
    textHeaderBytes.length +
    encoder.encode(text).length +
    textBodyBytes.length +
    urlHeaderBytes.length +
    wavHeaderBytes.length +
    wavBytes.length +
    footerBytes.length;

  const body = new Uint8Array(totalLength);
  let offset = 0;

  body.set(textHeaderBytes, offset);
  offset += textHeaderBytes.length;
  body.set(encoder.encode(text), offset);
  offset += encoder.encode(text).length;
  body.set(textBodyBytes, offset);
  offset += textBodyBytes.length;
  body.set(urlHeaderBytes, offset);
  offset += urlHeaderBytes.length;
  body.set(wavHeaderBytes, offset);
  offset += wavHeaderBytes.length;
  body.set(wavBytes, offset);
  offset += wavBytes.length;
  body.set(footerBytes, offset);

  return { body, boundary };
}

/**
 * POST /api/tts/generate-v2
 *
 * Route handler com streaming para o Pocket TTS.
 * Recebe FormData com text, voice_url (ou voice_wav),
 * aplica buffer de 3s via TransformStream e retorna audio stream.
 */
export async function POST(request: NextRequest) {
  try {
    const incomingContentType = request.headers.get('content-type') || '';

    // --- Parse FormData ---
    let text: string | null = null;
    let voiceUrl: string | null = null;
    let voiceWav: File | null = null;

    if (incomingContentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      text = formData.get('text') as string | null;
      voiceUrl = formData.get('voice_url') as string | null;
      const rawWav = formData.get('voice_wav');
      if (rawWav instanceof File) {
        voiceWav = rawWav;
      }
    }

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

    // --- Construir multipart/form-data para o Pocket TTS ---
    const { body, boundary } = await buildMultipartBody(
      text.trim(),
      voiceUrl || '',
      voiceWav || undefined,
    );
    const outgoingContentType = `multipart/form-data; boundary=${boundary}`;

    // --- Forward para Pocket TTS ---
    const ttsUrl = `${TTS_SERVER_URL}/tts`;

    const response = await fetch(ttsUrl, {
      method: 'POST',
      body: body as BodyInit,
      headers: { 'Content-Type': outgoingContentType },
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

    // --- Stream com buffer de 3s via TransformStream ---
    const startTime = Date.now();
    const transform = new TransformStream({
      transform(chunk: Uint8Array, controller) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= BUFFER_DURATION) {
          controller.enqueue(chunk);
        }
      },
    });

    const readableStream = response.body!.pipeThrough(transform);

    return new Response(readableStream, {
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
