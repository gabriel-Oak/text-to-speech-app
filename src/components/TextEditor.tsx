'use client';

import { useRef, useEffect, CSSProperties, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

const MAX_CHARS = 5000;
const WARNING_THRESHOLD = 4500;
const PLACEHOLDER =
  'Digite o texto que deseja sintetizar... Você pode usar múltiplos parágrafos.';

// ---------------------------------------------------------------------------
// Tipos do componente
// ---------------------------------------------------------------------------

export interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function TextEditor({
  value,
  onChange,
  placeholder = PLACEHOLDER,
}: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus na montagem
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      if (raw.length <= MAX_CHARS) {
        onChange(raw);
      }
    },
    [onChange],
  );

  const isNearLimit = value.length >= WARNING_THRESHOLD;
  const isAtLimit = value.length >= MAX_CHARS;

  // Cor dinâmica do contador
  let counterColor = '#4ade80';
  let counterBg = 'rgba(34, 197, 94, 0.12)';
  let counterBorder = '#22c55e';

  if (isAtLimit) {
    counterColor = '#fca5a5';
    counterBg = 'rgba(239, 68, 68, 0.15)';
    counterBorder = '#ef4444';
  } else if (isNearLimit) {
    counterColor = '#fde047';
    counterBg = 'rgba(234, 179, 8, 0.15)';
    counterBorder = '#eab308';
  }

  // Aviso visual quando próximo do limite
  const showNearLimitWarning = isNearLimit && !isAtLimit;

  return (
    <div style={styles.container}>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        style={{
          ...styles.textarea,
          borderColor: isNearLimit ? '#eab308' : '#334155',
        }}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        rows={6}
        aria-label="Editor de texto"
        aria-describedby="tts-editor-counter"
        aria-invalid={isAtLimit}
        role="textbox"
        tabIndex={0}
      />

      {/* Aviso visual quando próximo do limite */}
      {showNearLimitWarning && (
        <span style={styles.warningText}>
          Você está próximo do limite de {MAX_CHARS} caracteres.
        </span>
      )}

      {/* Contador de caracteres */}
      <div
        id="tts-editor-counter"
        style={{
          ...styles.counter,
          color: counterColor,
          background: counterBg,
          borderColor: counterBorder,
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
        #text-editor-textarea {
          resize: vertical;
          min-height: 150px;
          max-height: 480px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        #text-editor-textarea:hover:not(:disabled) {
          border-color: #475569;
        }

        #text-editor-textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
          outline: none;
        }

        #text-editor-textarea::placeholder {
          color: #64748b;
          font-style: italic;
        }

        #tts-editor-counter {
          transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
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
  textarea: {
    width: '100%',
    padding: '12px 14px',
    fontSize: 15,
    lineHeight: 1.6,
    color: '#e2e8f0',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    outline: 'none',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  warningText: {
    fontSize: 12,
    color: '#fde047',
    marginTop: 2,
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
    alignSelf: 'flex-end',
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
