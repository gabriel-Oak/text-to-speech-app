'use client';

import { useState, CSSProperties, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

const CUSTOM_URL_OPTION = '__custom__';
const LABEL_TEXT = 'Voz:';

// ---------------------------------------------------------------------------
// Dados das vozes builtin agrupadas por idioma
// ---------------------------------------------------------------------------

const VOICES_BY_LANGUAGE: Record<string, { label: string; names: string[] }> = {
  en: {
    label: 'English',
    names: [
      'alba',
      'anna',
      'azelma',
      'bill_boerst',
      'caro_davy',
      'charles',
      'cosette',
      'eponine',
      'eve',
      'fantine',
      'george',
      'jane',
      'javert',
      'jean',
      'marius',
      'mary',
      'michael',
      'paul',
      'peter_yearsley',
      'stuart_bell',
      'vera',
    ],
  },
  pt: {
    label: 'Português',
    names: ['rafael'],
  },
  it: {
    label: 'Italiano',
    names: ['giovanni'],
  },
  es: {
    label: 'Español',
    names: ['lola'],
  },
  de: {
    label: 'Deutsch',
    names: ['juergen'],
  },
  fr: {
    label: 'Français',
    names: ['estelle'],
  },
};

const LANGUAGE_ORDER = ['en', 'pt', 'it', 'es', 'de', 'fr'];

// ---------------------------------------------------------------------------
// Validação de URL
// ---------------------------------------------------------------------------

const VALID_URL_PREFIXES = ['http://', 'https://', 'hf://'];

function isValidUrl(value: string): boolean {
  return VALID_URL_PREFIXES.some((prefix) => value.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Tipos do componente
// ---------------------------------------------------------------------------

export interface VoiceSelectorV2Props {
  selectedVoice: string | null;
  onVoiceChange: (voice: string | null) => void;
  disabled: boolean;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function VoiceSelectorV2({
  selectedVoice,
  onVoiceChange,
  disabled,
}: VoiceSelectorV2Props) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Animação de revelação do input custom
  useEffect(() => {
    if (isCustomMode) {
      const timer = setTimeout(() => setShowCustomInput(true), 10);
      return () => clearTimeout(timer);
    }
    setShowCustomInput(false);
  }, [isCustomMode]);

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;

      if (value === CUSTOM_URL_OPTION) {
        setIsCustomMode(true);
        onVoiceChange(customUrl || null);
        return;
      }

      setIsCustomMode(false);
      setShowCustomInput(false);
      onVoiceChange(value || null);
    },
    [onVoiceChange, customUrl],
  );

  const handleCustomUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setCustomUrl(url);
      onVoiceChange(url || null);
    },
    [onVoiceChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsCustomMode(false);
      setShowCustomInput(false);
      setCustomUrl('');
      onVoiceChange(null);
    },
    [onVoiceChange],
  );

  const isCustomUrl = isCustomMode && customUrl.length > 0;
  const hasValue = !isCustomMode && selectedVoice != null;

  return (
    <div style={styles.container}>
      {/* Label */}
      <label
        style={{
          ...styles.label,
          opacity: disabled ? 0.4 : 1,
        }}
        id="voice-selector-label"
      >
        {LABEL_TEXT}
      </label>

      {isCustomMode ? (
        /* Input custom de URL — animação de entrada */
        <div
          style={{
            ...styles.customInputWrapper,
            opacity: showCustomInput ? 1 : 0,
            transform: showCustomInput ? 'translateY(0)' : 'translateY(-8px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          <input
            type="text"
            style={{
              ...styles.customInput,
              borderColor:
                customUrl.length > 0
                  ? isValidUrl(customUrl)
                    ? '#22c55e'
                    : '#ef4444'
                  : '#334155',
              opacity: disabled ? 0.55 : 1,
              cursor: disabled ? 'not-allowed' : 'text',
            }}
            placeholder="https://... ou hf://..."
            value={customUrl}
            onChange={handleCustomUrlChange}
            disabled={disabled}
            aria-label="URL personalizada da voz"
            aria-describedby="custom-url-help"
            autoFocus
          />
          {customUrl.length > 0 && (
            <button
              type="button"
              style={{
                ...styles.clearButton,
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              onClick={handleClear}
              aria-label="Limpar URL personalizada"
              title="Limpar URL personalizada"
              tabIndex={disabled ? -1 : 0}
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        /* Select dropdown */
        <div style={styles.selectWrapper}>
          <select
            id="voice-selector-v2-select"
            style={{
              ...styles.select,
              opacity: disabled ? 0.55 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            value={selectedVoice ?? ''}
            onChange={handleSelectChange}
            disabled={disabled}
            aria-label="Voz:"
            aria-describedby="voice-selector-label"
            tabIndex={0}
          >
            <option value="" disabled>
              — Selecione uma voz —
            </option>
            {LANGUAGE_ORDER.map((langCode) => {
              const group = VOICES_BY_LANGUAGE[langCode];
              if (!group) return null;

              return (
                <optgroup
                  key={langCode}
                  label={`${group.label} (${group.names.length})`}
                >
                  {group.names.map((voiceName) => (
                    <option key={voiceName} value={voiceName}>
                      {voiceName} ({langCode})
                    </option>
                  ))}
                </optgroup>
              );
            })}
            <option value={CUSTOM_URL_OPTION}>Custom URL...</option>
          </select>
        </div>
      )}

      {/* Botão de limpar — visível quando há valor selecionado */}
      {(hasValue || isCustomUrl) && !isCustomMode && (
        <button
          type="button"
          style={{
            ...styles.clearButton,
            alignSelf: 'flex-start',
            position: 'relative',
          }}
          onClick={handleClear}
          aria-label="Limpar seleção de voz"
          title="Limpar seleção de voz"
        >
          ✕
        </button>
      )}

      {/* Help text para URL custom */}
      {isCustomMode && (
        <span id="custom-url-help" style={styles.helpText} role="status">
          Insira uma URL válida começando com http://, https:// ou hf://
        </span>
      )}

      {/* Mensagem de erro de URL inválida */}
      {isCustomMode && customUrl.length > 0 && !isValidUrl(customUrl) && (
        <span style={styles.errorText} role="alert">
          URL deve começar com http://, https:// ou hf://
        </span>
      )}

      {/* Estilos CSS injetados */}
      <style>{`
        #voice-selector-v2-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease,
            background-color 0.2s ease;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394a3b8' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px;
        }

        #voice-selector-v2-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
          outline: none;
        }

        #voice-selector-v2-select:hover:not(:disabled) {
          border-color: #475569;
          background-color: #253043;
        }

        #voice-selector-v2-select option {
          background: #1e293b;
          color: #e2e8f0;
          padding: 8px;
        }

        #voice-selector-v2-custom-input {
          transition: border-color 0.2s ease, box-shadow 0.2s ease,
            background-color 0.2s ease;
        }

        #voice-selector-v2-custom-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
          outline: none;
        }

        #voice-selector-v2-custom-input:hover:not(:disabled) {
          border-color: #475569;
          background-color: #253043;
        }

        .voice-selector-clear-btn {
          transition: color 0.15s ease, background 0.15s ease,
            transform 0.15s ease;
        }

        .voice-selector-clear-btn:hover:not(:disabled) {
          color: #f3f4f6;
          background: rgba(59, 130, 246, 0.15);
          transform: scale(1.1);
        }
      `}</style>
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
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
    letterSpacing: '0.01em',
  },
  selectWrapper: {
    width: '100%',
    position: 'relative',
    transition: 'transform 0.15s ease',
  },
  select: {
    width: '100%',
    padding: '12px 40px 12px 14px',
    fontSize: 15,
    lineHeight: 1.5,
    color: '#e2e8f0',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    outline: 'none',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    cursor: 'pointer',
    transition:
      'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
  },
  customInputWrapper: {
    width: '100%',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  customInput: {
    width: '100%',
    padding: '12px 40px 12px 14px',
    fontSize: 15,
    lineHeight: 1.5,
    color: '#e2e8f0',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    outline: 'none',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    transition:
      'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: 4,
    lineHeight: 1,
    transition: 'color 0.15s ease, background 0.15s ease, transform 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#fca5a5',
    marginTop: 2,
  },
};
