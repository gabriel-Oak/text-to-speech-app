'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface VoiceUploadV2Props {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled: boolean;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const ALLOWED_EXTENSIONS = ['wav', 'mp3', 'ogg'];
const ACCEPT_MIME_TYPES = '.wav,.mp3,.ogg,audio/wav,audio/mpeg,audio/ogg';
const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DURATION = 30; // segundos

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getFileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function VoiceUploadV2({
  file,
  onFileChange,
  disabled,
}: VoiceUploadV2Props) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup do object URL
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Atualiza a URL do preview quando o arquivo muda (controlado pelo props)
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      // Animação suave de entrada do preview
      const timer = setTimeout(() => setShowPreview(true), 30);
      return () => clearTimeout(timer);
    } else {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setShowPreview(false);
      setAudioUrl(null);
      setAudioDuration(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Lê a duração do áudio
  const readAudioDuration = useCallback((file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'metadata';

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (audio.duration && isFinite(audio.duration)) {
          resolve(audio.duration);
        } else {
          reject(new Error('Duração do áudio não pôde ser determinada.'));
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Erro ao carregar o áudio para validar a duração.'));
      };

      audio.src = url;
    });
  }, []);

  // Validação e processamento do arquivo
  const processFile = useCallback(
    async (file: File) => {
      setErrorMessage('');

      // Validação de formato
      const ext = getFileExtension(file.name);
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setErrorMessage(
          `Formato "${ext}" não suportado. Aceita: .wav, .mp3, .ogg`,
        );
        return;
      }

      // Validação de tamanho
      if (file.size > MAX_SIZE) {
        setErrorMessage(
          `Arquivo muito grande (${formatFileSize(file.size)}). Máximo: ${formatFileSize(MAX_SIZE)}.`,
        );
        return;
      }

      // Validação de duração
      setIsProcessing(true);
      try {
        const duration = await readAudioDuration(file);
        if (duration > MAX_DURATION) {
          setErrorMessage(
            `Áudio muito longo (${formatDuration(duration)}). Máximo: ${formatDuration(MAX_DURATION)}.`,
          );
          setIsProcessing(false);
          return;
        }

        setAudioDuration(duration);
        onFileChange(file);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erro ao validar o áudio.',
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [readAudioDuration, onFileChange],
  );

  // Handlers de arquivo
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFile(e.target.files[0]);
      }
      // Reseta o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFile],
  );

  const handleRemove = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setShowPreview(false);
    setAudioUrl(null);
    setAudioDuration(null);
    setErrorMessage('');
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [audioUrl, onFileChange]);

  // Drag-and-drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled || isProcessing) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [disabled, isProcessing, processFile],
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  }, [disabled, isProcessing]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div style={styles.container}>
      {/* Estado desabilitado */}
      {disabled ? (
        <div style={styles.disabledContainer}>
          <span style={styles.disabledIcon}>🔒</span>
          <p style={styles.disabledText}>
            Selecione uma voz para habilitar o upload
          </p>
        </div>
      ) : (
        <>
          {/* Área de drag-and-drop */}
          <div
            style={{
              ...styles.dropZone,
              ...(dragActive ? styles.dropZoneActive : {}),
              ...(errorMessage ? styles.dropZoneError : {}),
            }}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-label="Área de upload de áudio para clonagem de voz"
            aria-describedby="upload-dropzone-hint"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_MIME_TYPES}
              style={styles.fileInput}
              onChange={handleFileInput}
              aria-hidden="true"
            />

            {isProcessing ? (
              <div style={styles.dropContentIdle}>
                <span style={styles.dropIcon}>⏳</span>
                <p style={styles.dropLabel}>Validando áudio...</p>
                <p style={styles.dropHint}>
                  Aguarde enquanto verificamos a duração
                </p>
              </div>
            ) : (
              <div style={styles.dropContentIdle}>
                <span style={styles.dropIcon}>🎵</span>
                <p style={styles.dropLabel}>
                  Arraste um arquivo ou{' '}
                  <span style={styles.dropLink}>selecione aqui</span>
                </p>
                <p id="upload-dropzone-hint" style={styles.dropHint}>
                  Formatos: .wav, .mp3, .ogg — Máx. 50MB, 30s
                </p>
              </div>
            )}
          </div>

          {/* Preview do arquivo — animação de entrada */}
          {file && audioUrl && (
            <div
              style={{
                ...styles.previewContainer,
                opacity: showPreview ? 1 : 0,
                transform: showPreview ? 'translateY(0)' : 'translateY(-12px)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              }}
            >
              <div style={styles.previewHeader}>
                <div style={styles.previewFileInfo}>
                  <span style={styles.previewFileName}>{file.name}</span>
                  <span style={styles.previewMeta}>
                    {formatFileSize(file.size)}
                    {audioDuration !== null && (
                      <>
                        {' · '}
                        {formatDuration(audioDuration)}
                      </>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  style={styles.removeButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  aria-label="Remover arquivo selecionado"
                  title="Remover arquivo selecionado"
                >
                  ✕
                </button>
              </div>

              {/* Player de áudio */}
              <audio
                src={audioUrl}
                controls
                style={styles.audioPlayer}
                preload="auto"
                aria-label={`Preview do áudio: ${file.name}`}
              />

              {/* Mensagem de erro */}
              {errorMessage && (
                <div style={styles.errorBar} role="alert">
                  <span style={styles.errorIcon}>⚠️</span>
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        .voice-upload-drop-zone:focus-visible {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
          outline: none;
        }

        .voice-upload-drop-zone:hover:not(:disabled) {
          border-color: #475569;
          background-color: #253043;
        }

        .voice-upload-remove-btn {
          transition: background-color 0.15s ease, color 0.15s ease,
            transform 0.15s ease;
        }

        .voice-upload-remove-btn:hover {
          background-color: rgba(239, 68, 68, 0.15) !important;
          color: #fca5a5 !important;
          transform: scale(1.15);
        }

        .voice-upload-audio::-webkit-media-controls-panel {
          background-color: #1e293b;
        }

        .voice-upload-audio::-webkit-media-controls-play-button {
          background-color: #3b82f6;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const styles: Record<string, CSSProperties> = {
  container: {
    width: '100%',
  },
  /* Disabled state */
  disabledContainer: {
    width: '100%',
    minHeight: 120,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '24px 16px',
    background: '#1e293b',
    border: '2px dashed #334155',
    borderRadius: 12,
    transition: 'border-color 0.2s ease, background-color 0.2s ease',
  },
  disabledIcon: {
    fontSize: 28,
  },
  disabledText: {
    fontSize: 14,
    color: '#94a3b8',
    margin: 0,
    textAlign: 'center',
  },
  /* Drop zone */
  dropZone: {
    width: '100%',
    minHeight: 130,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #334155',
    borderRadius: 12,
    padding: '24px 16px',
    cursor: 'pointer',
    background: '#1e293b',
    transition:
      'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
  },
  dropZoneActive: {
    borderColor: '#3b82f6',
    background: 'rgba(59, 130, 246, 0.08)',
    boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.2)',
  },
  dropZoneError: {
    borderColor: '#ef4444',
  },
  fileInput: {
    display: 'none',
  },
  dropContentIdle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    pointerEvents: 'none' as const,
  },
  dropIcon: {
    fontSize: 32,
    marginBottom: 2,
  },
  dropLabel: {
    fontSize: 15,
    color: '#e2e8f0',
    margin: 0,
  },
  dropLink: {
    color: '#3b82f6',
    fontWeight: 600,
    textDecoration: 'underline',
  },
  dropHint: {
    fontSize: 12,
    color: '#94a3b8',
    margin: 0,
  },
  /* Preview */
  previewContainer: {
    width: '100%',
    marginTop: 14,
    padding: 14,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    transition: 'border-color 0.2s ease, background-color 0.2s ease',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  previewFileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  previewFileName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  previewMeta: {
    fontSize: 12,
    color: '#94a3b8',
  },
  removeButton: {
    flexShrink: 0,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: 6,
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition:
      'background-color 0.15s ease, color 0.15s ease, transform 0.15s ease',
    padding: 0,
  },
  audioPlayer: {
    width: '100%',
    height: 36,
    borderRadius: 6,
  },
  /* Error bar */
  errorBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    borderRadius: 8,
    fontSize: 13,
    color: '#fca5a5',
  },
  errorIcon: {
    fontSize: 14,
    flexShrink: 0,
  },
};
