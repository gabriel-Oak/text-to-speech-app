'use client';

import type { CSSProperties, ChangeEvent } from 'react';
import type { Language } from '@/types/tts';

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

const LABEL_TEXT = 'Idioma:';

// Lista de idiomas com flag emoji + label legível
const LANGUAGES: { value: Language; flag: string; label: string }[] = [
  { value: 'english', flag: '🇺🇸', label: 'English' },
  { value: 'english_2026-01', flag: '🇺🇸', label: 'English (2026-01)' },
  { value: 'english_2026-04', flag: '🇺🇸', label: 'English (2026-04)' },
  { value: 'portuguese', flag: '🇧🇷', label: 'Português' },
  { value: 'portuguese_24l', flag: '🇧🇷', label: 'Português (24l)' },
  { value: 'french', flag: '🇫🇷', label: 'Français' },
  { value: 'french_24l', flag: '🇫🇷', label: 'Français (24l)' },
  { value: 'german', flag: '🇩🇪', label: 'Deutsch' },
  { value: 'german_24l', flag: '🇩🇪', label: 'Deutsch (24l)' },
  { value: 'italian', flag: '🇮🇹', label: 'Italiano' },
  { value: 'italian_24l', flag: '🇮🇹', label: 'Italiano (24l)' },
  { value: 'spanish', flag: '🇪🇸', label: 'Español' },
  { value: 'spanish_24l', flag: '🇪🇸', label: 'Español (24l)' },
];

// ---------------------------------------------------------------------------
// Tipos do componente
// ---------------------------------------------------------------------------

export interface LanguageSelectorProps {
  value: Language;
  onChange: (value: Language) => void;
  disabled?: boolean;
  label?: string;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function LanguageSelector({
  value,
  onChange,
  disabled = false,
  label = LABEL_TEXT,
}: LanguageSelectorProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value as Language);
  };

  return (
    <div style={styles.container}>
      {/* Label */}
      <label
        htmlFor="tts-language-select"
        style={{
          ...styles.label,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        {label}
      </label>

      {/* Select estilizado */}
      <select
        id="tts-language-select"
        style={{
          ...styles.select,
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-label={label}
        tabIndex={0}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>

      {/* Estilos CSS injetados */}
      <style>{`
        #tts-language-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
        }

        #tts-language-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
          outline: none;
        }

        #tts-language-select:hover:not(:disabled) {
          border-color: #4b5563;
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
    color: '#d1d5db',
    letterSpacing: '0.01em',
  },
  select: {
    width: '100%',
    padding: '12px 40px 12px 14px',
    fontSize: 15,
    lineHeight: 1.5,
    color: '#f3f4f6',
    background: '#111827',
    border: '1px solid #374151',
    borderRadius: 10,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer',
  },
};
