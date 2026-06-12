'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  // Atalhos
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const TOAST_DEFAULT_DURATION = 4000;
const TOAST_MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? TOAST_DEFAULT_DURATION,
    };

    setToasts((prev) => {
      const updated = [...prev, newToast].slice(-TOAST_MAX_VISIBLE);
      return updated;
    });

    // Auto-remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) =>
      addToast({ type: 'success', message, duration }),
    [addToast],
  );
  const error = useCallback(
    (message: string, duration?: number) =>
      addToast({ type: 'error', message, duration }),
    [addToast],
  );
  const info = useCallback(
    (message: string, duration?: number) =>
      addToast({ type: 'info', message, duration }),
    [addToast],
  );
  const warning = useCallback(
    (message: string, duration?: number) =>
      addToast({ type: 'warning', message, duration }),
    [addToast],
  );

  // Estabiliza o objeto de contexto para evitar que consumers
  // que colocam 'toast' em deps de useEffect causem loops infinitos.
  // As callbacks são stable; 'toasts' muda apenas quando toasts mudam,
  // mas isso não é um problema porque consumers usam apenas as callbacks.
  const stableValue = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      success,
      error,
      info,
      warning,
    }),
    [toasts, addToast, removeToast, success, error, info, warning],
  );

  return (
    <ToastContext.Provider value={stableValue}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Container de toasts (posicionado no canto superior direito)
// ---------------------------------------------------------------------------

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={styles.container}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item individual de toast
// ---------------------------------------------------------------------------

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const TYPE_CONFIG: Record<
  ToastType,
  { icon: string; bg: string; border: string; text: string }
> = {
  success: {
    icon: '✅',
    bg: 'rgba(34, 197, 94, 0.15)',
    border: '#22c55e',
    text: '#86efac',
  },
  error: {
    icon: '❌',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: '#ef4444',
    text: '#fca5a5',
  },
  info: {
    icon: 'ℹ️',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: '#3b82f6',
    text: '#60a5fa',
  },
  warning: {
    icon: '⚠️',
    bg: 'rgba(234, 179, 8, 0.15)',
    border: '#eab308',
    text: '#fde047',
  },
};

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const config = TYPE_CONFIG[toast.type];

  useEffect(() => {
    // Trigger entrance animation
    const t = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  return (
    <div
      style={{
        ...styles.toast,
        background: config.bg,
        border: `1px solid ${config.border}`,
        opacity: isVisible && !isExiting ? 1 : 0,
        transform: isExiting
          ? 'translateX(100%) scale(0.95)'
          : isVisible
            ? 'translateX(0) scale(1)'
            : 'translateX(20px) scale(0.95)',
        transition: isExiting
          ? 'opacity 0.3s ease, transform 0.3s ease'
          : 'opacity 0.25s ease, transform 0.25s ease',
      }}
      role="alert"
      aria-live="assertive"
    >
      <span style={styles.icon}>{config.icon}</span>
      <span style={styles.message}>{toast.message}</span>
      <button
        style={styles.closeButton}
        onClick={handleClose}
        aria-label="Fechar notificação"
        tabIndex={0}
      >
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 16,
    right: 16,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxWidth: 420,
    minWidth: 280,
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    fontSize: 14,
    color: '#f3f4f6',
    backdropFilter: 'blur(8px)',
    userSelect: 'none',
  },
  icon: {
    fontSize: 18,
    flexShrink: 0,
  },
  message: {
    flex: 1,
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontSize: 14,
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 4,
    lineHeight: 0,
    flexShrink: 0,
    transition: 'color 0.15s ease, background 0.15s ease',
  },
};

// ---------------------------------------------------------------------------
// Estilos CSS globais para animações
// ---------------------------------------------------------------------------

const globalStyles = `
  /* Toast entrance animation */
  @keyframes toast-enter {
    from {
      opacity: 0;
      transform: translateX(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  /* Toast exit animation */
  @keyframes toast-exit {
    from {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateX(100%) scale(0.95);
    }
  }

  /* Success pulse animation for AudioPlayer */
  @keyframes success-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
    }
    50% {
      box-shadow: 0 0 20px 6px rgba(34, 197, 94, 0.2);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
    }
  }

  /* Skeleton shimmer animation */
  @keyframes skeleton-shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: 200px 0;
    }
  }

  /* Fade in animation */
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Scale in animation */
  @keyframes scale-in {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Focus ring animation */
  @keyframes focus-ring {
    0% {
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    }
    100% {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
    }
  }
`;

// Inject global styles
if (typeof document !== 'undefined') {
  const styleId = 'tts-global-ux-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = globalStyles;
    document.head.appendChild(styleEl);
  }
}

export { globalStyles };
