'use client';

import { useState, useRef, useCallback, CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<
  string,
  { gradient: string; gradientHover: string }
> = {
  idle: {
    gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    gradientHover: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  },
  loading: {
    gradient: 'linear-gradient(135deg, #4b5563, #6b7280)',
    gradientHover: 'linear-gradient(135deg, #374151, #4b5563)',
  },
  success: {
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    gradientHover: 'linear-gradient(135deg, #059669, #047857)',
  },
  error: {
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    gradientHover: 'linear-gradient(135deg, #dc2626, #b91c1c)',
  },
};

const STATUS_LABELS: Record<string, string> = {
  idle: 'Gerar Áudio',
  loading: 'Gerando...',
  success: 'Gerado!',
  error: 'Erro',
};

// ---------------------------------------------------------------------------
// Ícones de status (SVG com fill/stroke que respeitam currentColor do botão pai)
// ---------------------------------------------------------------------------

function StatusIcon({ isError }: { isError?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      style={{ display: 'inline-flex', verticalAlign: 'middle' }}
      aria-hidden="true"
    >
      <circle
        cx={12}
        cy={12}
        r={10}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      {isError ? (
        <>
          <line
            x1="7"
            y1="7"
            x2="17"
            y2="17"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="17"
            y1="7"
            x2="7"
            y2="17"
            stroke="currentColor"
            strokeWidth="2"
          />
        </>
      ) : (
        <polyline
          points="6,12 10,16 18,8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tipos do componente
// ---------------------------------------------------------------------------

export interface GenerationButtonProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  disabled?: boolean; // também desabilita se texto vazio
  errorMessage?: string; // mensagem de erro para tooltip
  onClick: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function GenerationButton({
  status,
  disabled = false,
  errorMessage = '',
  onClick,
  buttonRef: externalRef,
}: GenerationButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const localRef = useRef<HTMLButtonElement>(null);
  const buttonRef = externalRef ?? localRef;

  const handleClick = useCallback(() => {
    if (disabled || status === 'loading') return;
    onClick();
  }, [disabled, status, onClick]);

  const handleMouseEnter = useCallback(() => {
    if (status === 'error') {
      setShowTooltip(true);
    }
    setIsHovered(true);
  }, [status]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
    setIsHovered(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const colors = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const isSuccess = status === 'success';

  return (
    <div style={styles.wrapper}>
      {/* Tooltip de erro */}
      {isError && errorMessage && showTooltip && (
        <div style={styles.tooltip} role="tooltip" aria-live="assertive">
          <div style={styles.tooltipArrow} />
          <span style={styles.tooltipText}>{errorMessage}</span>
        </div>
      )}

      {/* Botão principal */}
      <button
        ref={buttonRef}
        style={{
          ...styles.button,
          background: colors.gradient,
          opacity: disabled || isLoading ? 0.7 : 1,
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
          filter:
            !disabled && !isLoading && isHovered && !isSuccess
              ? 'brightness(1.1)'
              : 'none',
          transform: isSuccess
            ? 'scale(1.05)'
            : isHovered && !isError
              ? 'scale(1.02)'
              : 'scale(1)',
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        aria-label={label}
        aria-busy={isLoading ? 'true' : undefined}
        aria-describedby={isError ? 'generation-error-tooltip' : undefined}
        role="button"
        tabIndex={0}
      >
        {/* Spinner de loading ou ícone de status */}
        {isLoading && <span className="gb-spinner" aria-hidden="true" />}
        {!isLoading && <StatusIcon isError={isError} />}

        {/* Texto do botão */}
        <span
          style={{
            ...styles.buttonText,
            animation: isSuccess
              ? 'gb-pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              : 'none',
          }}
        >
          {label}
        </span>
      </button>

      {/* Indicador de status abaixo do botão (erro) */}
      {isError && !showTooltip && (
        <span id="generation-error-tooltip" style={styles.errorHint}>
          Passe o mouse para detalhes
        </span>
      )}

      {/* Estilos CSS injetados */}
      <style>{`
        @keyframes gb-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes gb-pop-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          60% {
            transform: scale(1.15);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .gb-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: gb-spin 1s linear infinite;
          flex-shrink: 0;
          margin-right: 10px;
          vertical-align: middle;
        }

        .gb-btn {
          transition: all 0.3s ease;
          outline: none;
          user-select: none;
        }

        .gb-btn:focus-visible {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5), 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .gb-btn:active:not(:disabled) {
          transform: scale(0.97) !important;
        }

        .gb-tooltip {
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estilos (CSS-in-JS)
// ---------------------------------------------------------------------------

const styles: Record<string, CSSProperties> = {
  wrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '14px 32px',
    fontSize: 17,
    fontWeight: 700,
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    fontFamily: 'inherit',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
    transition: 'all 0.3s ease',
  },
  buttonText: {
    display: 'inline-block',
    lineHeight: 1.3,
  },
  tooltip: {
    position: 'absolute',
    bottom: 'calc(100% + 12px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    color: '#fca5a5',
    whiteSpace: 'normal',
    maxWidth: 280,
    zIndex: 50,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    animation: 'gb-pop-in 0.2s ease-out',
  },
  tooltipArrow: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '8px solid #374151',
  },
  tooltipText: {
    display: 'block',
    lineHeight: 1.4,
  },
  errorHint: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
};
