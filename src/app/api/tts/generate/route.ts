import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice, language } = body;

    // Validação
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Texto é obrigatório e não pode ser vazio' },
        { status: 400 },
      );
    }

    if (!voice || typeof voice !== 'string') {
      return NextResponse.json({ error: 'Voz é obrigatória' }, { status: 400 });
    }

    if (!language || typeof language !== 'string') {
      return NextResponse.json(
        { error: 'Idioma é obrigatório' },
        { status: 400 },
      );
    }

    const ttsServerUrl =
      process.env.NEXT_PUBLIC_TTS_SERVER_URL || 'http://localhost:8000';

    const response = await fetch(`${ttsServerUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, language }),
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
    const contentType = audioBlob.type || 'audio/wav';

    return new NextResponse(audioBlob, {
      headers: {
        'Content-Type': contentType,
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
