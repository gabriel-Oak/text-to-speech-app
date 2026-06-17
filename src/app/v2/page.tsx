'use client';

import { useCallback, CSSProperties } from 'react';
import { ToastProvider } from '@/components/Toast';
import TextEditorV2 from '@/components/TextEditorV2';
import VoiceSelectorV2 from '@/components/VoiceSelectorV2';
import VoiceUploadV2 from '@/components/VoiceUploadV2';
import GenerationButton from '@/components/GenerationButton';
import AudioPlayer from '@/components/AudioPlayer';
import { useVoiceCloneV2 } from '@/hooks/useVoiceCloneV2';
import { useStreamAudio } from '@/hooks/useStreamAudio';

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------

function V2Content() {
  const voiceCloneState = useVoiceCloneV2();
  const streamAudio = useStreamAudio();

  const handleTextChange = useCallback(
    (value: string) => {
      voiceCloneState.setText(value);
    },
    [voiceCloneState],
  );

  const handleVoiceChange = useCallback(
    (voice: string | null) => {
      voiceCloneState.setSelectedVoice(voice);
    },
    [voiceCloneState],
  );

  const handleFileChange = useCallback(
    (file: File | null) => {
      voiceCloneState.setUploadedAudio(file);
    },
    [voiceCloneState],
  );

  const handleGenerate = useCallback(async () => {
    try {
      const result = await voiceCloneState.generateAudio();
      if (result?.audioUrl) {
        streamAudio.loadAudio(result.audioUrl, true);
      }
    } catch {
      // handled by useVoiceCloneV2 (error state + toast)
    }
  }, [voiceCloneState, streamAudio]);

  const hasText = voiceCloneState.state.text.trim().length > 0;
  const hasAudio = voiceCloneState.state.audioUrl !== null;
  const isLoading = voiceCloneState.state.isGenerating;
  const hasError = voiceCloneState.state.error !== null;

  const generationStatus: 'idle' | 'loading' | 'success' | 'error' = isLoading
    ? 'loading'
    : hasError
      ? 'error'
      : hasAudio
        ? 'success'
        : 'idle';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>🎙️ Voice Clone v2</h1>
        <p style={styles.headerSubtitle}>Gere áudio com vozes customizadas</p>
      </div>

      {/* Grid: texto (esquerda) + controles (direita) */}
      <div className="v2-grid">
        {/* Coluna esquerda: editor de texto */}
        <div className="v2-col-left">
          <TextEditorV2
            value={voiceCloneState.state.text}
            onChange={handleTextChange}
          />
        </div>

        {/* Coluna direita: seletor de voz + upload */}
        <div className="v2-col-right">
          <VoiceSelectorV2
            selectedVoice={voiceCloneState.state.selectedVoice}
            onVoiceChange={handleVoiceChange}
            disabled={voiceCloneState.disabledVoiceSelector}
          />

          <div style={{ marginTop: 14 }}>
            <VoiceUploadV2
              file={voiceCloneState.state.uploadedAudio}
              onFileChange={handleFileChange}
              disabled={voiceCloneState.disabledUpload}
            />
          </div>
        </div>
      </div>

      {/* Botão gerar */}
      <div className="v2-section">
        <GenerationButton
          status={generationStatus}
          disabled={!hasText}
          errorMessage={voiceCloneState.state.error ?? undefined}
          onClick={handleGenerate}
        />
      </div>

      {/* Player de áudio */}
      {hasAudio && streamAudio.audioUrl && (
        <div className="v2-section">
          <AudioPlayer
            src={streamAudio.audioUrl}
            filename="voice-clone-output.wav"
            showSuccessPulse={generationStatus === 'success'}
            audioElement={streamAudio.audioElement}
            isPlaying={streamAudio.isPlaying}
            currentTime={streamAudio.currentTime}
            duration={streamAudio.duration}
            onPlayPause={
              streamAudio.isPlaying ? streamAudio.pause : streamAudio.play
            }
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página (envolve com ToastProvider)
// ---------------------------------------------------------------------------

export default function V2Page() {
  return (
    <ToastProvider>
      <V2Content />
    </ToastProvider>
  );
}

// ---------------------------------------------------------------------------
// Estilos (CSS-in-JS)
// ---------------------------------------------------------------------------

const styles: Record<string, CSSProperties> = {
  container: {
    width: '100%',
  },
  header: {
    textAlign: 'center',
    padding: '28px 0 24px',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: '#f3f4f6',
    margin: '0 0 6px',
    letterSpacing: '-0.02em',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#9ca3af',
    margin: 0,
  },
};

// ---------------------------------------------------------------------------
// Estilos CSS injetados (responsividade + transições + seções)
// ---------------------------------------------------------------------------

const v2Styles = `
  .v2-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    transition: grid-template-columns 0.3s ease;
  }

  .v2-col-left,
  .v2-col-right {
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  @media (min-width: 768px) {
    .v2-grid {
      grid-template-columns: 1.6fr 1fr;
    }
  }

  .v2-section {
    margin-top: 20px;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  /* Focus ring global */
  .v2-grid button:focus-visible,
  .v2-grid input:focus-visible,
  .v2-grid select:focus-visible,
  .v2-grid textarea:focus-visible {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
    outline: none;
  }
`;

// Inject styles once
if (typeof document !== 'undefined') {
  const styleId = 'v2-page-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = v2Styles;
    document.head.appendChild(styleEl);
  }
}
