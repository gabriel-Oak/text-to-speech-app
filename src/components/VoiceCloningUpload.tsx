'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Voice, Language } from '@/types/tts';

// ---------------------------------------------------------------------------
// Tipos do componente
// ---------------------------------------------------------------------------

export type VoiceCloningStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error';

export interface VoiceCloningUploadProps {
  onVoiceCloned?: (voice: Voice) => void;
  defaultLanguage?: Language;
}

// ---------------------------------------------------------------------------
// Lista de idiomas para o seletor
// ---------------------------------------------------------------------------

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'english_2026-01', label: 'English (2026-01)' },
  { value: 'english_2026-04', label: 'English (2026-04)' },
  { value: 'portuguese', label: 'Português' },
  { value: 'portuguese_24l', label: 'Português (24L)' },
  { value: 'french', label: 'Français' },
  { value: 'french_24l', label: 'Français (24L)' },
  { value: 'german', label: 'Deutsch' },
  { value: 'german_24l', label: 'Deutsch (24L)' },
  { value: 'italian', label: 'Italiano' },
  { value: 'italian_24l', label: 'Italiano (24L)' },
  { value: 'spanish', label: 'Español' },
  { value: 'spanish_24l', label: 'Español (24L)' },
];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function VoiceCloningUpload({
  onVoiceCloned,
  defaultLanguage = 'portuguese',
}: VoiceCloningUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [voiceName, setVoiceName] = useState('');
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [status, setStatus] = useState<VoiceCloningStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100 progress indicator

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Limpa o object URL quando o componente desmonta
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Lê a duração do áudio usando o HTML Audio element
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

  // -----------------------------------------------------------------------
  // File validation handler
  // -----------------------------------------------------------------------

  const handleFile = useCallback(
    async (file: File) => {
      // Validação de formato
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'wav' && ext !== 'mp3') {
        setErrorMessage(
          'Formato não suportado. Aceita apenas arquivos .wav ou .mp3.',
        );
        setStatus('error');
        return;
      }

      // Validação de tamanho (max 50MB no cliente)
      const maxClientSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxClientSize) {
        setErrorMessage(
          'Arquivo muito grande. O tamanho máximo permitido é 50 MB.',
        );
        setStatus('error');
        return;
      }

      // Validação de duração
      setErrorMessage('');
      try {
        const duration = await readAudioDuration(file);
        if (duration > 30) {
          setErrorMessage(
            `Áudio muito longo (${duration.toFixed(1)}s). O limite é de 30 segundos.`,
          );
          setStatus('error');
          return;
        }

        // Sucesso na validação — guardar arquivo e URL de preview
        setSelectedFile(file);
        setAudioDuration(duration);
        setAudioUrl(URL.createObjectURL(file));
        setStatus('idle');
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erro ao validar o áudio.',
        );
        setStatus('error');
      }
    },
    [readAudioDuration],
  );

  // -----------------------------------------------------------------------
  // File selection handlers
  // -----------------------------------------------------------------------

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile],
  );

  // -----------------------------------------------------------------------
  // Drag-and-drop handlers
  // -----------------------------------------------------------------------

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

      if (status === 'processing' || status === 'uploading') return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        await handleFile(files[0]);
      }
    },
    [status, handleFile],
  );

  // -----------------------------------------------------------------------
  // Submit — chamar a API
  // -----------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedFile) {
        setErrorMessage('Selecione um arquivo de áudio primeiro.');
        setStatus('error');
        return;
      }

      const trimmedName = voiceName.trim();
      if (!trimmedName) {
        setErrorMessage('Informe um nome para a voz clonada.');
        setStatus('error');
        return;
      }

      setStatus('uploading');
      setProgress(10);
      setErrorMessage('');

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('name', trimmedName);
        formData.append('language', language);

        // Timeout de 120s — export pode demorar 10-30s
        const response = await fetch('/api/tts/voice/export', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(120000),
        });

        // Atualiza progresso após receber resposta
        setProgress(50);

        const data = await response.json();

        if (!response.ok) {
          const msg =
            data?.error || `Erro ${response.status}: ${response.statusText}`;
          setErrorMessage(msg);
          setStatus('error');
          return;
        }

        // Sucesso
        setProgress(100);
        const voice: Voice = {
          id: data.voiceId,
          name: data.name,
          language: language,
          type: 'cloned',
          safetensorsPath: data.safetensorsPath,
        };

        setStatus('success');

        // Notifica o componente pai (que exibirá o toast de sucesso)
        if (onVoiceCloned) {
          onVoiceCloned(voice);
        }

        // Limpa após um momento para mostrar o sucesso
        setTimeout(() => {
          setSelectedFile(null);
          setAudioUrl(null);
          setAudioDuration(null);
          setVoiceName('');
          setProgress(0);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 1500);
      } catch (err) {
        setProgress(0);
        const msg =
          err instanceof Error
            ? err.message
            : 'Erro inesperado ao clonar a voz.';
        setErrorMessage(msg);
        setStatus('error');
      }
    },
    [selectedFile, voiceName, language, onVoiceCloned],
  );

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setAudioUrl(null);
    setAudioDuration(null);
    setVoiceName('');
    setErrorMessage('');
    setProgress(0);
    setStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // -----------------------------------------------------------------------
  // Formatação de duração
  // -----------------------------------------------------------------------

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const isDisabled = status === 'processing' || status === 'uploading';

  return (
    <div style={styles.container}>
      {/* Título */}
      <h2 style={styles.title}>🎙️ Clonar Voz</h2>
      <p style={styles.subtitle}>
        Envie um arquivo de áudio com sua voz (máximo 30 segundos) para criar
        uma voz clonada personalizada.
      </p>

      {/* Drag-and-drop area */}
      <div
        style={{
          ...styles.dropZone,
          ...(dragActive ? styles.dropZoneActive : {}),
          ...(status === 'error' ? styles.dropZoneError : {}),
          ...(status === 'success' ? styles.dropZoneSuccess : {}),
        }}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
          if (!isDisabled) {
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Área de upload de áudio"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!isDisabled) {
              fileInputRef.current?.click();
            }
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,audio/wav,audio/mpeg"
          style={{ display: 'none' }}
          onChange={handleFileInput}
          aria-hidden="true"
        />

        {status === 'idle' || status === 'error' ? (
          <div style={styles.dropContentIdle}>
            <span style={styles.dropIcon}>📁</span>
            <p style={styles.dropLabel}>
              Arraste um arquivo ou{' '}
              <span style={styles.dropLink}>selecione aqui</span>
            </p>
            <p style={styles.dropHint}>
              Formatos aceitos: .wav, .mp3 — Máximo 30s de áudio
            </p>
          </div>
        ) : status === 'success' ? (
          <div style={styles.dropContentSuccess}>
            <span style={styles.dropIcon}>✅</span>
            <p style={styles.dropLabelSuccess}>Voz clonada com sucesso!</p>
            <button
              type="button"
              style={styles.resetButton}
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            >
              Nova clonagem
            </button>
          </div>
        ) : (
          <div style={styles.dropContentIdle}>
            <span style={styles.dropIcon}>📁</span>
            <p style={styles.dropLabel}>
              Arraste um arquivo ou{' '}
              <span style={styles.dropLink}>selecione aqui</span>
            </p>
            <p style={styles.dropHint}>
              Formatos aceitos: .wav, .mp3 — Máximo 30s de áudio
            </p>
          </div>
        )}
      </div>

      {/* Preview do áudio carregado */}
      {audioUrl && status !== 'success' && (
        <div style={styles.previewContainer}>
          <div style={styles.previewHeader}>
            <span style={styles.previewFileName}>🎵 {selectedFile?.name}</span>
            {audioDuration !== null && (
              <span style={styles.previewDuration}>
                Duração: {formatDuration(audioDuration)}
              </span>
            )}
          </div>

          {/* Player de áudio */}
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            style={styles.audioPlayer}
            preload="auto"
          />

          <button
            type="button"
            style={styles.removeButton}
            onClick={(e) => {
              e.stopPropagation();
              if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
              }
              handleReset();
            }}
            disabled={isDisabled}
          >
            Remover arquivo
          </button>
        </div>
      )}

      {/* Formulário de clonagem — visível apenas durante idle e error (enquanto o usuário preenche) */}
      {selectedFile && (status === 'idle' || status === 'error') && (
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Nome da voz */}
          <div style={styles.fieldGroup}>
            <label htmlFor="voiceName" style={styles.label}>
              Nome da voz
            </label>
            <input
              id="voiceName"
              type="text"
              placeholder="Ex: Minha voz personalizada"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              style={styles.input}
              maxLength={100}
              disabled={isDisabled}
              aria-required="true"
            />
          </div>

          {/* Idioma */}
          <div style={styles.fieldGroup}>
            <label htmlFor="voiceLanguage" style={styles.label}>
              Idioma
            </label>
            <select
              id="voiceLanguage"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              style={styles.select}
              disabled={isDisabled}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Botão de submissão */}
          <button
            type="submit"
            className="vs-submit-button"
            style={styles.submitButton}
          >
            🎙️ Clonar Voz
          </button>
        </form>
      )}

      {/* Spinner e progresso durante upload / processing */}
      {(status === 'uploading' || status === 'processing') && (
        <div style={styles.spinnerContainer}>
          <span className="vs-spinner" />
          <span style={styles.spinnerText}>
            {status === 'uploading'
              ? 'Enviando áudio para o servidor...'
              : 'Exportando para safetensors... (pode demorar 10-30s)'}
          </span>
        </div>
      )}

      {/* Barra de progresso visual */}
      {(status === 'uploading' ||
        status === 'processing' ||
        status === 'success') && (
        <div style={styles.progressContainer}>
          <div
            style={{
              ...styles.progressBar,
              width: `${progress}%`,
              transition: 'width 0.5s ease',
            }}
          />
          <span style={styles.progressText}>
            {status === 'success'
              ? '100%'
              : status === 'uploading'
                ? `${progress}%`
                : 'processing'}
          </span>
        </div>
      )}

      {/* Mensagens de erro / sucesso */}
      {status === 'error' && (
        <div style={styles.messageBar} role="alert">
          <span style={styles.messageIcon}>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {status === 'success' && (
        <div style={styles.successBar} role="status">
          <span style={styles.successIcon}>✅</span>
          <span>
            Voz clonada com sucesso! Ela já está disponível no seletor de vozes.
          </span>
        </div>
      )}

      {/* Estilos CSS (injetados inline) */}
      <style>{`
        @keyframes vs-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .vs-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: vs-spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
        /* Botão de clonar voz — hover e disabled */
        .vs-submit-button:hover:not(:disabled) {
          background-color: #1d4ed8 !important;
        }
        .vs-submit-button:disabled {
          background-color: #4b5563 !important;
          cursor: not-allowed !important;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estilos (CSS-in-JS com classes)
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: 560,
    margin: '0 auto',
    padding: 24,
    borderRadius: 12,
    background: '#111827',
    border: '1px solid #1f2937',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#f3f4f6',
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    margin: '0 0 20px',
    lineHeight: 1.5,
  },
  dropZone: {
    width: '100%',
    minHeight: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #374151',
    borderRadius: 10,
    padding: 24,
    cursor: 'pointer',
    transition: 'border-color 0.2s, background-color 0.2s',
    marginBottom: 16,
  },
  dropZoneActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  dropZoneError: {
    borderColor: '#ef4444',
  },
  dropZoneSuccess: {
    borderColor: '#22c55e',
  },
  dropContentIdle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    pointerEvents: 'none',
  },
  dropIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  dropLabel: {
    fontSize: 15,
    color: '#d1d5db',
    margin: 0,
  },
  dropLink: {
    color: '#3b82f6',
    fontWeight: 600,
    textDecoration: 'underline',
  },
  dropHint: {
    fontSize: 12,
    color: '#6b7280',
    margin: 0,
  },
  dropContentSuccess: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'none',
  },
  dropLabelSuccess: {
    fontSize: 15,
    color: '#4ade80',
    margin: 0,
    fontWeight: 600,
  },
  resetButton: {
    fontSize: 13,
    color: '#3b82f6',
    background: 'transparent',
    border: '1px solid #3b82f6',
    borderRadius: 6,
    padding: '4px 12px',
    cursor: 'pointer',
    marginTop: 4,
  },
  previewContainer: {
    width: '100%',
    marginBottom: 16,
    padding: 12,
    background: '#1f2937',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  previewFileName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e5e7eb',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  previewDuration: {
    fontSize: 12,
    color: '#9ca3af',
    background: '#374151',
    padding: '2px 8px',
    borderRadius: 4,
  },
  audioPlayer: {
    width: '100%',
    height: 36,
    borderRadius: 6,
  },
  removeButton: {
    alignSelf: 'flex-start',
    fontSize: 13,
    color: '#ef4444',
    background: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: 6,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#d1d5db',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    color: '#f3f4f6',
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: 8,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    color: '#f3f4f6',
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: 8,
    outline: 'none',
    cursor: 'pointer',
  },
  submitButton: {
    width: '100%',
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    background: '#2563eb',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  spinnerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '16px 0',
  },
  spinnerText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  messageBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    marginTop: 12,
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    borderRadius: 8,
    fontSize: 14,
    color: '#fca5a5',
  },
  messageIcon: {
    fontSize: 16,
    flexShrink: 0,
  },
  successBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    marginTop: 12,
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid #22c55e',
    borderRadius: 8,
    fontSize: 14,
    color: '#86efac',
  },
  successIcon: {
    fontSize: 16,
    flexShrink: 0,
  },
};
