import { NextRequest, NextResponse } from 'next/server';
import { execSync, execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Helpers — audio duration detection (no external deps)
// ---------------------------------------------------------------------------

/**
 * Parses a WAV file header to extract duration in seconds.
 * Returns null if not a valid WAV or duration cannot be determined.
 */
function getWavDuration(buffer: Buffer): number | null {
  if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== 'RIFF')
    return null;
  if (buffer.length < 12 || buffer.toString('ascii', 8, 12) !== 'WAVE')
    return null;

  let offset = 12;
  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    if (chunkId === 'fmt ') {
      const numChannels = buffer.readUInt16LE(offset + 10);
      const sampleRate = buffer.readUInt32LE(offset + 12);
      const bitsPerSample = buffer.readUInt16LE(offset + 22);

      if (numChannels > 0 && sampleRate > 0 && bitsPerSample > 0) {
        const byteRate = (numChannels * sampleRate * bitsPerSample) / 8;
        const dataChunkIdx = buffer.indexOf(Buffer.from('data'), offset + 4);
        if (dataChunkIdx !== -1 && dataChunkIdx + 4 < buffer.length) {
          const dataSize = buffer.readUInt32LE(dataChunkIdx + 4);
          return Math.round((dataSize / byteRate) * 100) / 100;
        }
      }
      break;
    }
    const chunkSize = buffer.readUInt32LE(offset + 4);
    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset += 1;
  }

  return null;
}

/**
 * Estimates MP3 duration from file size using a typical voice bitrate.
 * Returns null on unrecognisable content.
 */
function estimateMp3Duration(buffer: Buffer): number | null {
  const firstBytes = buffer.slice(0, 4).toString('hex');

  let audioSize: number;

  if (firstBytes.startsWith('494433')) {
    // ID3v2 header present
    const id3Size = buffer.readUInt32BE(6) >> 7;
    audioSize = buffer.length - (10 + id3Size);
  } else if (
    firstBytes.startsWith('fffb') ||
    firstBytes.startsWith('fff3') ||
    firstBytes.startsWith('ff93') ||
    firstBytes.startsWith('ff23')
  ) {
    // Raw MP3 sync frame
    audioSize = buffer.length;
  } else {
    return null;
  }

  // Typical voice bitrate for Pocket TTS
  const bitrateBps = 128_000;
  return Math.round(((audioSize * 8) / bitrateBps) * 100) / 100;
}

function getAudioDuration(buffer: Buffer, ext: string): number | null {
  if (ext === 'wav' || ext === 'wave') return getWavDuration(buffer);
  if (ext === 'mp3') return estimateMp3Duration(buffer);
  return null;
}

/**
 * Checks whether the pocket-tts binary is available on PATH.
 */
function isPocketTtsAvailable(): boolean {
  try {
    execFileSync('pocket-tts', ['--help'], { timeout: 5000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_DURATION_SECONDS = 30;
const EXPORT_TIMEOUT_MS = 120_000;
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30 MB safety limit
const TTS_VOICES_DIR = join(process.cwd(), '.tts-voices');
const TTS_SERVER_URL =
  process.env.NEXT_PUBLIC_TTS_SERVER_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let tempPath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const language = formData.get('language') as string | null;

    // --- Validate inputs ---

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo de áudio é obrigatório' },
        { status: 400 },
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome da voz é obrigatório' },
        { status: 400 },
      );
    }

    if (!language || typeof language !== 'string') {
      return NextResponse.json(
        { error: 'Idioma é obrigatório' },
        { status: 400 },
      );
    }

    // --- Validate file type ---

    const fileName = file.name.toLowerCase();
    const ext = fileName.split('.').pop() || '';
    const allowedExtensions = ['wav', 'mp3'];

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: 'Formato não suportado. Aceita apenas .wav ou .mp3' },
        { status: 400 },
      );
    }

    // --- Validate file size ---

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024} MB`,
        },
        { status: 400 },
      );
    }

    // --- Validate audio duration ---

    const audioBuffer = Buffer.from(await file.arrayBuffer());
    const duration = getAudioDuration(audioBuffer, ext);

    if (duration !== null) {
      if (duration > MAX_DURATION_SECONDS) {
        return NextResponse.json(
          {
            error: `Áudio muito longo (${duration.toFixed(2)}s). O Pocket TTS suporta no máximo ${MAX_DURATION_SECONDS} segundos.`,
          },
          { status: 400 },
        );
      }
      if (duration <= 0) {
        return NextResponse.json(
          { error: 'Não foi possível determinar a duração do áudio.' },
          { status: 400 },
        );
      }
    }

    // --- Ensure output directory exists ---

    if (!existsSync(TTS_VOICES_DIR)) {
      mkdirSync(TTS_VOICES_DIR, { recursive: true });
    }

    // --- Create temp file ---

    const voiceId = randomUUID();
    const safeName = name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    tempPath = join(TTS_VOICES_DIR, `temp-${voiceId}.${ext}`);
    const safetensorsFilename = `${safeName}.safetensors`;
    const safetensorsAbsolutePath = join(TTS_VOICES_DIR, safetensorsFilename);

    writeFileSync(tempPath, audioBuffer);

    // --- Decide export strategy ---

    const useCLI = isPocketTtsAvailable();
    const pocketTtsBin = process.env.POCKET_TTS_BIN || 'pocket-tts';

    if (useCLI) {
      // ---- Primary: pocket-tts CLI ----

      const cmd = `${pocketTtsBin} export-voice --language ${language} "${tempPath}" "${safetensorsAbsolutePath}"`;

      execSync(cmd, {
        timeout: EXPORT_TIMEOUT_MS,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!existsSync(safetensorsAbsolutePath)) {
        throw new Error(
          'O arquivo .safetensors não foi gerado pelo Pocket TTS.',
        );
      }
    } else {
      // ---- Fallback: HTTP endpoint of Pocket TTS server ----

      const fallbackUrl = `${TTS_SERVER_URL}/export-voice`;

      const fallbackFormData = new FormData();
      fallbackFormData.append('file', file, file.name);
      fallbackFormData.append('name', name.trim());
      fallbackFormData.append('language', language);

      let response: Response;
      try {
        response = await fetch(fallbackUrl, {
          method: 'POST',
          body: fallbackFormData,
          signal: AbortSignal.timeout(EXPORT_TIMEOUT_MS),
        });
      } catch (fetchError) {
        const err = fetchError as Error;
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          return NextResponse.json(
            {
              error: `Tempo limite excedido ao conectar com o servidor TTS (${EXPORT_TIMEOUT_MS / 1000}s).`,
            },
            { status: 504 },
          );
        }
        return NextResponse.json(
          {
            error: `Falha ao conectar com o servidor TTS para exportação: ${err.message}`,
          },
          { status: 502 },
        );
      }

      if (!response.ok) {
        const errorBody = await response.text();
        return NextResponse.json(
          {
            error: `Falha na exportação via servidor TTS (${response.status}): ${errorBody}`,
          },
          { status: response.status },
        );
      }

      const result = await response.json();

      if (result && result.safetensorsPath) {
        // Server may return a relative or absolute path
        const returnedPath = result.safetensorsPath.startsWith('/')
          ? result.safetensorsPath
          : join(process.cwd(), result.safetensorsPath);

        if (!existsSync(returnedPath)) {
          throw new Error(
            'O arquivo .safetensors retornado pelo servidor não foi encontrado.',
          );
        }

        return NextResponse.json({
          voiceId,
          name: safeName,
          safetensorsPath: result.safetensorsPath,
        });
      }
    }

    // --- Success ----

    return NextResponse.json({
      voiceId,
      name: safeName,
      safetensorsPath: `.tts-voices/${safetensorsFilename}`,
    });
  } catch (error) {
    // Always clean up the temporary audio file
    if (tempPath && existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch {
        // Best effort — don't throw here
      }
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: `Tempo limite excedido (${EXPORT_TIMEOUT_MS / 1000}s). A exportação da voz pode estar demorando mais do que o esperado.`,
        },
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
