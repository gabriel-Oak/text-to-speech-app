'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { GenerationStatus, Language } from '@/types/tts';
import type { Voice } from '@/types/tts';

// Hooks
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useVoiceCloning } from '@/hooks/useVoiceCloning';

// Components
import TextInput from '@/components/TextInput';
import LanguageSelector from '@/components/LanguageSelector';
import VoiceSelector from '@/components/VoiceSelector';
import VoiceCloningUpload from '@/components/VoiceCloningUpload';
import AudioPlayer from '@/components/AudioPlayer';
import GenerationButton from '@/components/GenerationButton';
import { ToastProvider, useToast } from '@/components/Toast';

// ---------------------------------------------------------------------------
// Mapeamento: GenerationStatus (hook) → GenerationButton status
// ---------------------------------------------------------------------------

function mapGenerationStatus(
  gs: GenerationStatus,
): 'idle' | 'loading' | 'success' | 'error' {
  switch (gs) {
    case GenerationStatus.Generating:
      return 'loading';
    case GenerationStatus.Ready:
      return 'success';
    case GenerationStatus.Error:
      return 'error';
    default:
      return 'idle';
  }
}

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------

function HomeContent() {
  // Estado controlado pela página
  const [text, setText] = useState('');
  const [language, setLanguage] = useState<Language>('portuguese');
  const [voice, setVoice] = useState('rafael');
  const [voiceSelectorKey, setVoiceSelectorKey] = useState(0);

  // Hooks
  const {
    status,
    audioUrl,
    error,
    generate,
    reset: _reset,
  } = useTextToSpeech();
  const { refreshVoices: _refreshVoices, cloningStatus: _cloningStatus } =
    useVoiceCloning();

  // Toast
  const toast = useToast();

  const mappedStatus = mapGenerationStatus(status);
  const isGenerating = status === GenerationStatus.Generating;

  // Ref para o botão de geração (atalho Ctrl+Enter)
  const generateBtnRef = useRef<HTMLButtonElement>(null);

  // Callback ref para passar ao GenerationButton
  const _setGenerateBtnRef = useCallback((el: HTMLButtonElement | null) => {
    generateBtnRef.current = el;
  }, []);

  // Atalho de teclado: Ctrl+Enter para gerar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (text.trim().length > 0 && !isGenerating) {
          generateBtnRef.current?.click();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [text, isGenerating]);

  // Feedback de sucesso ao gerar áudio
  useEffect(() => {
    if (status === GenerationStatus.Ready && audioUrl) {
      toast.success('Áudio gerado com sucesso!', 3000);
    }
  }, [status, audioUrl, toast]);

  // Feedback de erro ao gerar áudio
  useEffect(() => {
    if (status === GenerationStatus.Error && error) {
      toast.error(`Erro ao gerar áudio: ${error}`, 6000);
    }
  }, [status, error, toast]);

  // -----------------------------------------------------------------------
  // Callbacks
  // -----------------------------------------------------------------------

  const handleTextChange = useCallback((value: string) => {
    setText(value);
  }, []);

  const handleLanguageChange = useCallback((value: Language) => {
    setLanguage(value);
  }, []);

  const handleVoiceChange = useCallback((value: string) => {
    setVoice(value);
  }, []);

  // Quando uma nova voz é clonada: auto-seleciona e força re-fetch do VoiceSelector
  const handleVoiceCloned = useCallback((clonedVoice: Voice) => {
    setVoice(clonedVoice.id);
    setVoiceSelectorKey((prev) => prev + 1);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (text.trim().length === 0 || !voice) return;
    await generate(text, voice, language);
  }, [text, voice, language, generate]);

  // Retry handler para erros de geração
  const handleRetry = useCallback(async () => {
    if (text.trim().length > 0 && voice) {
      toast.info('Tentando novamente...', 2000);
      await generate(text, voice, language);
    }
  }, [text, voice, language, generate, toast]);

  const handleAudioEnded = useCallback(() => {
    // Reseta o botão para idle após o áudio terminar
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      {/* Estilos globais da página */}
      <style>{`
        .pocket-tts-page {
          min-height: 100vh;
          background: #0f172a;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pocket-tts-container {
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .pocket-tts-header {
          text-align: center;
          padding: 32px 0 24px;
          margin-bottom: 0;
        }

        .pocket-tts-header h1 {
          font-size: 28px;
          font-weight: 800;
          color: #f3f4f6;
          margin: 0 0 6px;
          letter-spacing: -0.02em;
        }

        .pocket-tts-header p {
          font-size: 15px;
          color: #9ca3af;
          margin: 0;
        }

        .pocket-tts-section {
          padding: 20px 0;
          border-bottom: 1px solid #1e293b;
        }

        .pocket-tts-section:last-child {
          border-bottom: none;
        }

        .pocket-tts-row {
          display: flex;
          gap: 16px;
        }

        .pocket-tts-row > * {
          flex: 1;
        }

        .pocket-tts-audio-section {
          display: flex;
          justify-content: center;
          padding-top: 8px;
        }

        .pocket-tts-error-bar {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 10px;
          padding: 12px 16px;
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #fca5a5;
        }

        .pocket-tts-error-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        .pocket-tts-retry-btn {
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 600;
          color: #60a5fa;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid #3b82f6;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: background 0.15s ease, color 0.15s ease;
          outline: none;
          font-family: inherit;
        }

        .pocket-tts-retry-btn:hover {
          background: rgba(59, 130, 246, 0.2);
          color: #90c4fa;
        }

        .pocket-tts-retry-btn:focus-visible {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);
        }

        .pocket-tts-retry-btn:active {
          transform: scale(0.97);
        }

        @media (max-width: 480px) {
          .pocket-tts-page {
            padding: 16px 8px;
          }
          .pocket-tts-header h1 {
            font-size: 24px;
          }
          .pocket-tts-row {
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>

      <div className="pocket-tts-page">
        <div className="pocket-tts-container">
          {/* Header */}
          <div className="pocket-tts-header">
            <h1>🎙️ Pocket TTS</h1>
            <p>Texto para fala com IA</p>
          </div>

          {/* Seção 1: Texto para falar */}
          <div className="pocket-tts-section">
            <TextInput
              value={text}
              onChange={handleTextChange}
              disabled={isGenerating}
              label="Texto para falar"
              rows={5}
            />
          </div>

          {/* Seção 2: Idioma e Voz */}
          <div className="pocket-tts-section">
            <div className="pocket-tts-row">
              <LanguageSelector
                value={language}
                onChange={handleLanguageChange}
                disabled={isGenerating}
                label="🌐 Idioma:"
              />
              <VoiceSelector
                key={voiceSelectorKey}
                value={voice}
                onChange={handleVoiceChange}
                disabled={isGenerating}
                label="🎤 Voz:"
              />
            </div>
          </div>

          {/* Seção 3: Clonar Voz */}
          <div className="pocket-tts-section">
            <VoiceCloningUpload
              onVoiceCloned={handleVoiceCloned}
              defaultLanguage={language}
            />
          </div>

          {/* Seção 4: Botão Gerar */}
          <div className="pocket-tts-section">
            <div style={{ position: 'relative' }}>
              <GenerationButton
                status={mappedStatus}
                disabled={text.trim().length === 0 || isGenerating}
                errorMessage={error || undefined}
                onClick={handleGenerate}
                buttonRef={generateBtnRef}
              />
              {/* Atalho de teclado hint */}
              {!isGenerating && text.trim().length > 0 && (
                <span style={styles.shortcutHint}>Ctrl+Enter para gerar</span>
              )}
            </div>
          </div>

          {/* Seção 5: Player de áudio (apenas quando pronto) */}
          {(status === GenerationStatus.Ready ||
            status === GenerationStatus.Error) && (
            <div className="pocket-tts-section">
              <div className="pocket-tts-audio-section">
                {status === GenerationStatus.Ready && audioUrl && (
                  <AudioPlayer
                    src={audioUrl}
                    filename="pocket-tts-audio.wav"
                    onEnded={handleAudioEnded}
                  />
                )}
              </div>

              {/* Barra de erro com retry (quando aplica) */}
              {status === GenerationStatus.Error && (
                <div className="pocket-tts-error-bar" role="alert">
                  <span className="pocket-tts-error-icon">❌</span>
                  <span style={{ flex: 1 }}>
                    {error || 'Erro ao gerar áudio.'}
                  </span>
                  <button
                    className="pocket-tts-retry-btn"
                    onClick={handleRetry}
                    aria-label="Tentar novamente"
                    tabIndex={0}
                  >
                    ↴ Tentar novamente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Página principal (envolve com ToastProvider)
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <ToastProvider>
      <HomeContent />
    </ToastProvider>
  );
}

// ---------------------------------------------------------------------------
// Estilos inline para o atalho hint
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  shortcutHint: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    whiteSpace: 'nowrap',
    fontFamily: 'monospace',
  },
};
