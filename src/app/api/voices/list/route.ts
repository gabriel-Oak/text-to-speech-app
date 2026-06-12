import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { Voice, Language } from '@/types/tts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TTS_VOICES_DIR = join(process.cwd(), '.tts-voices');

// ---------------------------------------------------------------------------
// Built-in voices (hardcoded, separated by type)
// ---------------------------------------------------------------------------

const builtinVoices: Voice[] = [
  // English voices (VCTK)
  {
    id: randomUUID(),
    name: 'anna',
    language: 'english',
    type: 'builtin',
    audioUrl:
      'https://huggingface.co/kyutai/tts-voices/resolve/main/vctk/p228_023_enhanced.wav',
  },
  {
    id: randomUUID(),
    name: 'azelma',
    language: 'english',
    type: 'builtin',
    audioUrl:
      'https://huggingface.co/kyutai/tts-voices/resolve/main/vctk/p303_023_enhanced.wav',
  },
  {
    id: randomUUID(),
    name: 'charles',
    language: 'english',
    type: 'builtin',
    audioUrl:
      'https://huggingface.co/kyutai/tts-voices/resolve/main/vctk/p254_023_enhanced.wav',
  },
  {
    id: randomUUID(),
    name: 'eve',
    language: 'english',
    type: 'builtin',
    audioUrl:
      'https://huggingface.co/kyutai/tts-voices/resolve/main/vctk/p361_023_enhanced.wav',
  },
  {
    id: randomUUID(),
    name: 'jane',
    language: 'english',
    type: 'builtin',
    audioUrl:
      'https://huggingface.co/kyutai/tts-voices/resolve/main/vctk/p339_023_enhanced.wav',
  },
  {
    id: randomUUID(),
    name: 'paul',
    language: 'english',
    type: 'builtin',
    audioUrl:
      'https://huggingface.co/kyutai/tts-voices/resolve/main/vctk/p259_023_enhanced.wav',
  },
  // English voices (other)
  {
    id: randomUUID(),
    name: 'alba',
    language: 'english',
    type: 'builtin',
    audioUrl:
      'https://huggingface.co/kyutai/tts-voices/resolve/main/alba-mackenna/casual.wav',
  },
  // Italian
  {
    id: randomUUID(),
    name: 'giovanni',
    language: 'italian',
    type: 'builtin',
    audioUrl:
      'https://huggingface.co/kyutai/pocket-tts/resolve/main/common_voice_it_36520747-enhanced-v2.mp3',
  },
  // Spanish
  {
    id: randomUUID(),
    name: 'lola',
    language: 'spanish',
    type: 'builtin',
    audioUrl:
      'https://huggingface.co/kyutai/pocket-tts/resolve/main/common_voice_es_19762977-enhanced-v2.mp3',
  },
  // German
  {
    id: randomUUID(),
    name: 'juergen',
    language: 'german',
    type: 'builtin',
    audioUrl:
      'https://huggingface.co/kyutai/pocket-tts/resolve/main/de-DE-juergen.mp3',
  },
  // Portuguese
  {
    id: randomUUID(),
    name: 'rafael',
    language: 'portuguese',
    type: 'builtin',
    audioUrl:
      'https://huggingface.co/kyutai/pocket-tts/resolve/main/g-Vi8PgmSY0-enhanced-v2.wav',
  },
  // French
  {
    id: randomUUID(),
    name: 'estelle',
    language: 'french',
    type: 'builtin',
    audioUrl:
      'https://huggingface.co/kyutai/tts-voices/resolve/main/unmute-prod-website/developpeuse-3.wav',
  },
];

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET() {
  // Collect built-in voices
  const voices: Voice[] = [...builtinVoices];

  // List cloned voices from .tts-voices/
  if (existsSync(TTS_VOICES_DIR)) {
    const files = readdirSync(TTS_VOICES_DIR);
    const safetensorsFiles = files.filter((f) => f.endsWith('.safetensors'));

    for (const file of safetensorsFiles) {
      const name = file.replace('.safetensors', '');
      voices.push({
        id: randomUUID(),
        name,
        language: 'english' as Language,
        type: 'cloned',
        safetensorsPath: `.tts-voices/${file}`,
      });
    }
  }

  return NextResponse.json({ voices }, { status: 200 });
}
