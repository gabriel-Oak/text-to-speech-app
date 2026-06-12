'use client';

import { useRef, useCallback, CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

const MAX_CHARS = 2000;
const WARNING_THRESHOLD = 1800;
const DANGER_THRESHOLD = 1950;
const PLACEHOLDER = 'Digite o texto que deseja converter em fala...';

// ---------------------------------------------------------------------------
// Tipos do componente
// ---------------------------------------------------------------------------

export interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  rows?: number;
}

// ---------------------------------------------------------------------------
// Cores dinâmicas para o contador
// ---------------------------------------------------------------------------

function getCounterStyle(length: number): {
  color: string;
  bg: string;
  borderColor: string;
} {
  if (length >= DANGER_THRESHOLD) {
    return {
      color: '#fca5a5',
      bg: 'rgba(239, 68, 68, 0.15)',
      borderColor: '#ef4444',
    };
  }
  if (length >= WARNING_THRESHOLD) {
    return {
      color: '#fde047',
      bg: 'rgba(234, 179, 8, 0.15)',
      borderColor: '#eab308',
    };
  }
  return {
    color: '#4ade80',
    bg: 'rgba(34, 197, 94, 0.12)',
    borderColor: '#22c55e',
  };
}

function getBorderColor(disabled: boolean, hasValue: boolean): string {
  if (disabled) return '#374151';
  if (hasValue) return '#4b5563';
  return '#374151';
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function TextInput({
  value,
  onChange,
  disabled = false,
  label = 'Texto',
  rows = 5,
}: TextInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      // Garante que o limite é respeitado mesmo se o onChange externo permitir
      if (raw.length <= MAX_CHARS) {
        onChange(raw);
      }
    },
    [onChange],
  );

  const counterStyle = getCounterStyle(value.length);
  const borderStyle = getBorderColor(disabled, value.length > 0);

  return (
    <div style={styles.container}>
      {/* Label */}
      <label
        htmlFor="tts-text-input"
        style={{
          ...styles.label,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        {label}
      </label>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        id="tts-text-input"
        style={{
          ...styles.textarea,
          borderColor: borderStyle,
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        placeholder={PLACEHOLDER}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        rows={rows}
        maxLength={MAX_CHARS}
        aria-label={label}
        aria-describedby="tts-char-counter"
        aria-invalid={value.length >= DANGER_THRESHOLD}
        role="textbox"
        tabIndex={0}
      />

      {/* Contador de caracteres */}
      <div
        id="tts-char-counter"
        style={{
          ...styles.counter,
          color: counterStyle.color,
          background: counterStyle.bg,
          borderColor: counterStyle.borderColor,
        }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span style={styles.counterText}>
          {value.length}/{MAX_CHARS}
        </span>
        <span style={styles.counterLabel}>caracteres</span>
      </div>

      {/* Estilos CSS injetados */}
      <style>{`
        #tts-text-input {
          resize: vertical;
          min-height: 120px;
          max-height: 360px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        #tts-text-input:hover:not(:disabled) {
          border-color: #4b5563;
        }

        #tts-text-input:focus:not(:disabled) {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
          outline: none;
        }

        #tts-text-input::placeholder {
          color: #6b7280;
          font-style: italic;
        }

        #tts-text-input:disabled::placeholder {
          color: #4b5563;
        }

        #tts-char-counter {
          transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estilos (CSS-in-JS com classes)
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
    color: '#d1d5db',
    letterSpacing: '0.01em',
  },
  textarea: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 15,
    lineHeight: 1.6,
    color: '#f3f4f6',
    background: '#111827',
    border: '1px solid #374151',
    borderRadius: 10,
    outline: 'none',
    fontFamily: 'inherit',
  },
  counter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    border: '1px solid transparent',
  },
  counterText: {
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  counterLabel: {
    fontSize: 12,
    opacity: 0.75,
  },
};
