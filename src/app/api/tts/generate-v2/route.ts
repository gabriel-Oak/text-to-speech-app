import { NextRequest, NextResponse } from 'next/server';

const TTS_SERVER_URL =
  process.env.NEXT_PUBLIC_TTS_SERVER_URL || 'http://localhost:8000';
const BUFFER_DURATION = 3000; // ms
const REQUEST_TIMEOUT = 60000; // ms

/**
 * Constrói o body multipart/form-data como string para o Pocket TTS.
 * Segue o mesmo padrão da rota /api/tts/generate que funciona.
 */
function buildMultipartBody(
  text: string,
  voiceUrl: string,
  voiceWav?: File,
): { body: string; boundary: string; wavFile?: File } {
  const boundary = `v2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let body = `--${boundary}\r\n`;
  body += 'Content-Disposition: form-data; name="text"\r\n\r\n';
  body += `${text}\r\n`;

  if (voiceUrl) {
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="voice_url"\r\n\r\n';
    body += `${voiceUrl}\r\n`;
  }

  if (voiceWav) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="voice_wav"; filename="${voiceWav.name}"\r\n`;
    body += `Content-Type: ${voiceWav.type || 'audio/wav'}\r\n\r\n`;
    // Arquivo binário será anexado separadamente
    return { body, boundary, wavFile: voiceWav };
  }

  body += `--${boundary}--\r\n`;
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

    const wavFile = voiceWav instanceof File ? (voiceWav as File) : undefined;

    // --- Construir body multipart como string (mesmo padrão da rota /generate) ---
    const {
      body,
      boundary,
      wavFile: wavFromFile,
    } = buildMultipartBody(text.trim(), voiceUrl || '', wavFile);

    const outgoingContentType = `multipart/form-data; boundary=${boundary}`;

    // --- Forward para Pocket TTS ---
    const ttsUrl = `${TTS_SERVER_URL}/tts`;

    let response: Response;

    if (wavFromFile) {
      // Com arquivo: body = string + binário
      const wavBytes = Buffer.from(await wavFromFile.arrayBuffer());
      const fullBody = body + (wavBytes as unknown as string);

      response = await fetch(ttsUrl, {
        method: 'POST',
        body: fullBody,
        headers: { 'Content-Type': outgoingContentType },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
    } else {
      // Sem arquivo: body 100% string
      response = await fetch(ttsUrl, {
        method: 'POST',
        body,
        headers: { 'Content-Type': outgoingContentType },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
    }

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
