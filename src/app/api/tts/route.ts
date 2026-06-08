import { NextRequest, NextResponse } from 'next/server';

const TTS_SERVER_URL =
  process.env.NEXT_PUBLIC_TTS_SERVER_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  let text: string | undefined;
  let voiceName: string | undefined;
  let voiceFile: File | undefined;

  try {
    if (contentType.includes('multipart/form-data')) {
      // --- FormData route ---
      const formData = await request.formData();
      text = formData.get('text') as string | undefined;
      voiceFile = formData.get('voiceFile') as File | undefined;
    } else {
      // --- JSON route ---
      const body = await request.json();
      text = body.text as string | undefined;
      voiceName = body.voiceName as string | undefined;
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body. Expected JSON or FormData.' },
      { status: 400 },
    );
  }

  // --- Validation ---
  if (!text || text.trim() === '') {
    return NextResponse.json(
      { error: 'The "text" field is required and cannot be empty.' },
      { status: 400 },
    );
  }

  // Reject when both voiceName and voiceFile are provided
  if (voiceName && voiceFile) {
    return NextResponse.json(
      {
        error:
          'Cannot provide both voiceName and voiceFile. Use one or the other.',
      },
      { status: 400 },
    );
  }

  // --- Build the upstream request ---
  let url = `${TTS_SERVER_URL}/tts`;

  if (voiceName) {
    // Pre-loaded voice via query parameter
    url += `?voice_url=${encodeURIComponent(voiceName)}&text=${encodeURIComponent(text)}`;
  } else if (voiceFile) {
    // Voice cloning via multipart upload
    const cloneFormData = new FormData();
    cloneFormData.append('text', text.trim());
    cloneFormData.append('voice_wav', voiceFile);
    return proxyToPocketTTS(cloneFormData, undefined);
  } else {
    // Default: no voice parameter
    url += `?text=${encodeURIComponent(text)}`;
  }

  return proxyToPocketTTS(undefined, url);
}

async function proxyToPocketTTS(
  formData: FormData | undefined,
  url: string | undefined,
): Promise<NextResponse<unknown> | NextResponse<ReadableStream<Uint8Array>>> {
  try {
    const response = await fetch(url!, {
      method: 'POST',
      headers: formData
        ? {} // let fetch set Content-Type + boundary automatically
        : { 'Content-Type': 'application/json' },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return NextResponse.json(
        {
          error: `Pocket TTS server error`,
          details: errorBody || response.statusText,
          status: response.status,
        },
        { status: response.status },
      );
    }

    const audioStream = response.body as ReadableStream<Uint8Array>;
    const contentType = response.headers.get('content-type') || 'audio/wav';

    return new NextResponse(audioStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to connect to Pocket TTS server.',
        details: message,
      },
      { status: 502 },
    );
  }
}
