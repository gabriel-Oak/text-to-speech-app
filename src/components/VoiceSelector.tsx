'use client';

import { useState, useEffect, useCallback, useRef, CSSProperties } from 'react';
import type { Voice } from '@/types/tts';

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

const LABEL_TEXT = 'Voz:';
const API_VOICES_URL = '/api/voices/list';

// Mapeamento de códigos de idioma para labels legíveis
const LANGUAGE_LABELS: Record<string, string> = {
  english: 'en',
  english_2026_01: 'en',
  english_2026_04: 'en',
  portuguese: 'pt',
  portuguese_24l: 'pt',
  french: 'fr',
  french_24l: 'fr',
  german: 'de',
  german_24l: 'de',
  italian: 'it',
  italian_24l: 'it',
  spanish: 'es',
  spanish_24l: 'es',
};

// ---------------------------------------------------------------------------
// Tipos do componente
// ---------------------------------------------------------------------------

export interface VoiceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

interface GroupedVoices {
  builtin: Voice[];
  cloned: Voice[];
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function VoiceSelector({
  value,
  onChange,
  disabled = false,
  label = LABEL_TEXT,
}: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchVoices = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_VOICES_URL, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(
          `Falha ao carregar vozes: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      if (mountedRef.current) {
        setVoices(data.voices || []);
      }
    } catch (err) {
      if (mountedRef.current) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erro desconhecido ao carregar vozes';
        setError(message);
        setVoices([]);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  // Agrupa vozes por tipo
  const grouped = useCallback((): GroupedVoices => {
    const builtin: Voice[] = [];
    const cloned: Voice[] = [];

    for (const voice of voices) {
      if (voice.type === 'builtin') {
        builtin.push(voice);
      } else {
        cloned.push(voice);
      }
    }

    return { builtin, cloned };
  }, [voices]);

  // Formata nome da voz para exibição
  const formatVoiceName = (voice: Voice): string => {
    const lang = LANGUAGE_LABELS[voice.language] || voice.language;
    return `${voice.name} (${lang})`;
  };

  // Determina o nome da voz selecionada para exibição
  const selectedVoiceName = (() => {
    const selected = voices.find((v) => v.id === value || v.name === value);
    if (!selected) return '— Selecione uma voz —';
    return formatVoiceName(selected);
  })();

  // Atualiza o valor selecionado e fecha o dropdown
  const handleSelect = useCallback(
    (voiceId: string) => {
      onChange(voiceId);
      setOpen(false);
    },
    [onChange],
  );

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-voice-selector]')) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Fecha ao pressionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const { builtin: builtinVoices, cloned: clonedVoices } = grouped();
  const hasVoices = builtinVoices.length > 0 || clonedVoices.length > 0;

  return (
    <div style={styles.container}>
      {/* Label */}
      <label
        htmlFor="tts-voice-select"
        style={{
          ...styles.label,
          opacity: disabled || loading ? 0.4 : 1,
        }}
      >
        {label}
      </label>

      {/* Trigger do dropdown — select customizado */}
      <div
        data-voice-selector
        style={{
          ...styles.triggerWrapper,
          opacity: disabled || loading ? 0.55 : 1,
        }}
      >
        {/* Área clicável que abre/fecha o dropdown */}
        <button
          type="button"
          id="tts-voice-select"
          style={{
            ...styles.trigger,
            cursor:
              disabled || loading || !hasVoices ? 'not-allowed' : 'pointer',
            ...(open ? styles.triggerOpen : {}),
          }}
          disabled={disabled || loading || !hasVoices}
          onClick={() => {
            if (!disabled && !loading && hasVoices) {
              setOpen((prev) => !prev);
            }
          }}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={label}
          tabIndex={0}
        >
          <span style={styles.triggerText}>{selectedVoiceName}</span>
          <svg
            style={{
              ...styles.chevron,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
          >
            <path
              d="M1 1.5L6 6.5L11 1.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Dropdown aberto */}
        {open && (
          <div
            style={styles.dropdown}
            role="listbox"
            aria-label="Selecione uma voz"
          >
            {/* Estado de loading com skeleton */}
            {loading && (
              <div style={styles.skeletonContainer}>
                <div style={styles.skeletonItem} />
                <div style={styles.skeletonItem} />
                <div style={styles.skeletonItem} />
                <div style={styles.skeletonItem} />
                <div style={styles.skeletonItem} />
              </div>
            )}

            {/* Mensagem de erro com retry */}
            {error && !loading && (
              <div style={styles.errorItem} role="alert">
                <span style={styles.errorIcon}>⚠️</span>
                <span style={{ flex: 1, wordBreak: 'break-word' }}>
                  {error}
                </span>
                <button
                  className="retry-button"
                  style={{
                    ...styles.retryButton,
                    ...(retrying
                      ? { opacity: 0.5, cursor: 'not-allowed' }
                      : {}),
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRetrying(true);
                    fetchVoices();
                    setRetrying(false);
                  }}
                  disabled={retrying}
                  aria-label="Tentar novamente"
                >
                  {retrying ? '⏳' : '↴'}
                </button>
              </div>
            )}

            {/* Opções — Built-in */}
            {builtinVoices.length > 0 && !loading && (
              <>
                <div style={styles.groupHeader}>
                  <span style={styles.groupIcon}>🎙️</span>
                  <span style={styles.groupLabel}>Built-in</span>
                  <span style={styles.groupCount}>
                    {builtinVoices.length}{' '}
                    {builtinVoices.length === 1 ? 'voz' : 'vozes'}
                  </span>
                </div>

                {builtinVoices.map((voice) => (
                  <VoiceOption
                    key={voice.id}
                    voice={voice}
                    selected={value === voice.id || value === voice.name}
                    onSelect={handleSelect}
                    formatName={formatVoiceName}
                  />
                ))}
              </>
            )}

            {/* Separador entre grupos */}
            {builtinVoices.length > 0 && clonedVoices.length > 0 && (
              <div style={styles.divider} />
            )}

            {/* Opções — Clonadas */}
            {clonedVoices.length > 0 && !loading && (
              <>
                <div style={styles.groupHeader}>
                  <span style={styles.groupIcon}>🔊</span>
                  <span style={styles.groupLabel}>Clonadas</span>
                  <span style={styles.groupCount}>
                    {clonedVoices.length}{' '}
                    {clonedVoices.length === 1 ? 'voz' : 'vozes'}
                  </span>
                </div>

                {clonedVoices.map((voice) => (
                  <VoiceOption
                    key={voice.id}
                    voice={voice}
                    selected={value === voice.id || value === voice.name}
                    onSelect={handleSelect}
                    formatName={formatVoiceName}
                  />
                ))}
              </>
            )}

            {/* Nenhuma voz disponível */}
            {!loading && !error && !hasVoices && (
              <div style={styles.emptyItem} role="status">
                <span style={styles.emptyIcon}>🎙️</span>
                <span>Nenhuma voz disponível</span>
                <span style={styles.emptyHint}>
                  Selecione um idioma ou clone uma voz para começar
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Estilos CSS (injetados inline) */}
      <style>{`
        @keyframes vs-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .vs-loading-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: vs-spin 0.6s linear infinite;
          flex-shrink: 0;
        }

        #tts-voice-select {
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }

        #tts-voice-select:focus:not(:disabled) {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
          outline: none;
        }

        #tts-voice-select:hover:not(:disabled):not(:active) {
          border-color: #4b5563;
        }

        [data-voice-selector] .vs-option:hover {
          background-color: rgba(59, 130, 246, 0.1) !important;
        }

        [data-voice-selector] .vs-option-cloned:hover {
          background-color: rgba(139, 92, 246, 0.1) !important;
        }

        [data-voice-selector] .vs-option:focus-visible {
          border-color: #3b82f6;
          outline: none;
        }

        [data-voice-selector] .retry-button:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.25) !important;
          color: #fde047 !important;
        }

        [data-voice-selector] .retry-button:focus-visible {
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.4) !important;
        }

        [data-voice-selector] .retry-button:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }

        @keyframes skeleton-shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: 200px 0;
          }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: Opção individual
// ---------------------------------------------------------------------------

interface VoiceOptionProps {
  voice: Voice;
  selected: boolean;
  onSelect: (voiceId: string) => void;
  formatName: (voice: Voice) => string;
}

function VoiceOption({
  voice,
  selected,
  onSelect,
  formatName,
}: VoiceOptionProps) {
  const isCloned = voice.type === 'cloned';

  return (
    <div
      className={`vs-option ${isCloned ? 'vs-option-cloned' : ''}`}
      role="option"
      aria-selected={selected}
      style={{
        ...styles.option,
        ...(isCloned ? styles.optionCloned : {}),
        ...(selected ? styles.optionSelected : {}),
      }}
      tabIndex={0}
      onClick={() => onSelect(voice.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(voice.id);
        }
      }}
    >
      <span style={styles.optionName}>{formatName(voice)}</span>
      {selected && <span style={styles.checkIcon}>✓</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estilos (CSS-in-JS)
// ---------------------------------------------------------------------------

const styles: Record<string, CSSProperties> = {
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#d1d5db',
    letterSpacing: '0.01em',
  },
  triggerWrapper: {
    width: '100%',
    position: 'relative',
  },
  trigger: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 40px 12px 14px',
    fontSize: 15,
    lineHeight: 1.5,
    color: '#f3f4f6',
    background: '#111827',
    border: '1px solid #374151',
    borderRadius: 10,
    outline: 'none',
    fontFamily: 'inherit',
    textAlign: 'left',
  },
  triggerOpen: {
    borderColor: '#3b82f6',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)',
  },
  triggerText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  },
  chevron: {
    flexShrink: 0,
    color: '#9ca3af',
    transition: 'transform 0.2s ease',
    marginLeft: 8,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: '#111827',
    border: '1px solid #374151',
    borderTop: 'none',
    borderRadius: '0 0 10px 10px',
    maxHeight: 280,
    overflowY: 'auto',
    zIndex: 100,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    scrollbarWidth: 'thin',
    scrollbarColor: '#374151 transparent',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#6b7280',
    background: '#0d1117',
    borderBottom: '1px solid #1f2937',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  groupIcon: {
    fontSize: 13,
  },
  groupLabel: {
    flex: 1,
  },
  groupCount: {
    fontSize: 10,
    background: '#1f2937',
    padding: '1px 6px',
    borderRadius: 4,
    color: '#9ca3af',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    fontSize: 14,
    color: '#d1d5db',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    userSelect: 'none',
  },
  optionCloned: {
    background: 'rgba(139, 92, 246, 0.04)',
    borderLeftWidth: '2px solid #8b5cf6',
  },
  optionSelected: {
    background: 'rgba(59, 130, 246, 0.12)',
    color: '#60a5fa',
    fontWeight: 600,
  },
  optionName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  },
  checkIcon: {
    flexShrink: 0,
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 700,
    marginLeft: 8,
  },
  loadingItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '16px 14px',
    color: '#9ca3af',
    fontSize: 14,
  },
  loadingText: {
    fontStyle: 'italic',
  },
  skeletonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '12px 14px',
  },
  skeletonItem: {
    height: 32,
    borderRadius: 8,
    background: 'linear-gradient(90deg, #1f2937 25%, #2a3a4f 50%, #1f2937 75%)',
    backgroundSize: '200px 100%',
    animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
  },
  retryButton: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 14,
    color: '#fca5a5',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.15s ease, color 0.15s ease',
    outline: 'none',
    lineHeight: 0,
  },

  emptyHint: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  errorItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    fontSize: 13,
    color: '#fca5a5',
    background: 'rgba(239, 68, 68, 0.08)',
    borderTop: '1px solid rgba(239, 68, 68, 0.2)',
  },
  errorIcon: {
    flexShrink: 0,
    fontSize: 14,
  },
  emptyItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '24px 14px',
    color: '#6b7280',
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 28,
    opacity: 0.6,
  },
  divider: {
    height: 1,
    background: '#1f2937',
    margin: '2px 0',
  },
};
