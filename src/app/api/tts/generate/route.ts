import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const incomingContentType = request.headers.get('content-type') || '';
    let text: string | null = null;
    let voice: string | null = null;

    if (incomingContentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      text = formData.get('text') as string | null;
      voice = formData.get('voice') as string | null;
    } else {
      const json = await request.json();
      text = json?.text as string | null;
      voice = json?.voice as string | null;
    }

    // Validação
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Texto é obrigatório e não pode ser vazio' },
        { status: 400 },
      );
    }

    const ttsServerUrl =
      process.env.NEXT_PUBLIC_TTS_SERVER_URL || 'http://localhost:8000';

    // O Pocket TTS exige multipart/form-data com boundary no header.
    // O fetch do Node.js não envia o boundary no Content-Type,
    // então o FastAPI rejeita. Construímos manualmente.
    const boundary = `nextjs-tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const outgoingContentType = `multipart/form-data; boundary=${boundary}`;

    let body = `--${boundary}\r\n`;
    body += 'Content-Disposition: form-field; name="text"\r\n\r\n';
    body += `${text.trim()}\r\n`;

    if (voice && voice.trim().length > 0) {
      body += `--${boundary}\r\n`;
      body += 'Content-Disposition: form-field; name="voice_url"\r\n\r\n';
      body += `${voice.trim()}\r\n`;
    }

    body += `--${boundary}--\r\n\r\n`;

    const response = await fetch(`${ttsServerUrl}/tts`, {
      method: 'POST',
      body,
      headers: { 'Content-Type': outgoingContentType },
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `Erro no servidor TTS: ${errorBody}` },
        { status: response.status },
      );
    }

    const audioBlob = await response.blob();
    const audioContentType = audioBlob.type || 'audio/x-wav';

    return new NextResponse(audioBlob, {
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
