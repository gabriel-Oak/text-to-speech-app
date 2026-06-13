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

    // Resolve voice: can be a builtin name (e.g., 'rafael'), a cloned voice
    // name, a UUID from the VoiceSelector, or a .safetensors path.
    let voiceParam: string | null = null;
    if (voice && voice.trim().length > 0) {
      const fs = await import('fs');
      const path = await import('path');
      const ttsVoicesDir = path.join(process.cwd(), '.tts-voices');

      if (fs.existsSync(ttsVoicesDir)) {
        // 1. Direct match: <voice>.safetensors exists (cloned voice name)
        const directPath = path.join(ttsVoicesDir, `${voice.trim()}.safetensors`);
        if (fs.existsSync(directPath)) {
          voiceParam = directPath;
        } else {
          // 2. Voice is a UUID — match against cloned voices via /api/voices/list
          const safetensorsFiles = fs.readdirSync(ttsVoicesDir).filter((f) => f.endsWith('.safetensors'));
          if (safetensorsFiles.length > 0) {
            try {
              const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
              const voicesRes = await fetch(`${base}/api/voices/list`);
              const voicesData = await voicesRes.json();
              const allVoices = voicesData?.voices || [];
              const targetVoice = allVoices.find((v: any) => v.id === voice.trim());
              if (targetVoice && targetVoice.type === 'cloned') {
                const safetensorsName = `${targetVoice.name}.safetensors`;
                if (safetensorsFiles.includes(safetensorsName)) {
                  voiceParam = path.join(ttsVoicesDir, safetensorsName);
                }
              }
            } catch {
              // ignore — fall through to treating as builtin
            }
          }
        }
      }

      // 3. If no .safetensors match, treat as a builtin voice name.
      //    Pocket TTS accepts builtin names only when voice_url is omitted
      //    (it uses get_default_voice_for_language()) or when the name is
      //    in _ORIGINS_OF_PREDEFINED_VOICES. We pass it as voice_url since
      //    Pocket TTS 2.1+ accepts builtin names as simple strings.
      if (!voiceParam) {
        voiceParam = voice.trim();
      }
    }

    if (voiceParam) {
      body += `--${boundary}\r\n`;
      body += 'Content-Disposition: form-field; name="voice_url"\r\n\r\n';
      body += `${voiceParam}\r\n`;
      console.error(`[TTS] Final voice_url: ${voiceParam}`);
    }

    body += `--${boundary}--\r\n\r\n`;

    console.error(`[TTS] Sending to ${ttsServerUrl}/tts`);
    const response = await fetch(`${ttsServerUrl}/tts`, {
      method: 'POST',
      body,
      headers: { 'Content-Type': outgoingContentType },
      signal: AbortSignal.timeout(60000),
    });

    console.error(`[TTS] Response status: ${response.status}, headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[TTS] Error body: ${errorBody}`);
      return NextResponse.json(
        { error: `Erro no servidor TTS: ${errorBody}` },
        { status: response.status },
      );
    }

    const audioContentType =
      response.headers.get('content-type') || 'audio/x-wav';

    return new NextResponse(response.body, {
      status: response.status,
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
