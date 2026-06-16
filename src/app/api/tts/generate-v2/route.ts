import { NextRequest, NextResponse } from 'next/server';

const TTS_SERVER_URL =
  process.env.NEXT_PUBLIC_TTS_SERVER_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 60000; // ms

/**
 * Constrói o corpo multipart/form-data como array de Buffers.
 * Isso evita problemas de conversão string→UTF-8→corrupção de bytes.
 */
function buildMultipartParts(
  text: string,
  voiceUrl: string,
  voiceWav?: File,
): { parts: Buffer[]; boundary: string } {
  const boundary = `v2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const parts: Buffer[] = [];

  // Part: text (sempre presente)
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="text"\r\n\r\n${text}\r\n`,
    ),
  );

  // Se há voice_wav, NÃO enviamos voice_url (o Pocket TTS precisa de apenas um)
  if (voiceWav) {
    // Part: voice_wav (header + conteúdo binário será adicionado no handler)
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="voice_wav"; filename="${voiceWav.name}"\r\nContent-Type: ${voiceWav.type || 'audio/wav'}\r\n\r\n`,
      ),
    );
    return { parts, boundary };
  }

  // Part: voice_url (somente quando NÃO há voice_wav)
  if (voiceUrl) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="voice_url"\r\n\r\n${voiceUrl}\r\n`,
      ),
    );
  }

  // Footer
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return { parts, boundary };
}

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

    const wavFile = voiceWav instanceof File ? (voiceWav as File) : undefined;

    // --- Construir body multipart como array de Buffers ---
    const { parts, boundary } = buildMultipartParts(
      text.trim(),
      voiceUrl || '',
      wavFile,
    );

    const outgoingContentType = `multipart/form-data; boundary=${boundary}`;

    // --- Forward para Pocket TTS ---
    const ttsUrl = `${TTS_SERVER_URL}/tts`;

    let fullBody: Buffer;

    if (wavFile) {
      // Com arquivo: parts + bytes binários do arquivo
      const wavBytes = Buffer.from(await wavFile.arrayBuffer());
      fullBody = Buffer.concat([...parts, wavBytes]);
    } else {
      // Sem arquivo: parts já inclui o footer
      fullBody = Buffer.concat(parts);
    }

    const response = await fetch(ttsUrl, {
      method: 'POST',
      body: fullBody,
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
