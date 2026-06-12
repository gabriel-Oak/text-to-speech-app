'use client';

import { useState, useRef, useCallback, useEffect, CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

const BAR_COUNT = 28;
const MIN_BAR_HEIGHT = 3;
const MAX_BAR_HEIGHT = 32;
const DEFAULT_FILENAME = 'audio.wav';
const PLAY_PAUSE_LABEL = 'Reproduzir';
const VOLUME_LABEL = 'Volume';
const DOWNLOAD_LABEL = 'Baixar áudio';

// ---------------------------------------------------------------------------
// Tipos do componente
// ---------------------------------------------------------------------------

export interface AudioPlayerProps {
  src: string; // URL do áudio (object URL ou URL remota)
  filename?: string; // nome para download (default: 'audio.wav')
  onEnded?: () => void;
  showSuccessPulse?: boolean; // animação de sucesso ao montar
}

// ---------------------------------------------------------------------------
// Helpers de tempo
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function AudioPlayer({
  src,
  filename = DEFAULT_FILENAME,
  onEnded,
  showSuccessPulse = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Estado
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [barHeights, setBarHeights] = useState<number[]>(() =>
    Array(BAR_COUNT).fill(MIN_BAR_HEIGHT),
  );
  const [isDownloading, setIsDownloading] = useState(false);

  // Cleanup de object URLs
  const objectUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    const urls = objectUrls.current;
    // Registrar object URL para cleanup
    if (src.startsWith('blob:')) {
      urls.add(src);
    }

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, [src]);

  // Callbacks do elemento audio
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (onEnded) {
      onEnded();
    }
  }, [onEnded]);

  const handleError = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Play / Pause
  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  }, [isPlaying]);

  // Seek
  const handleSeekChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = time;
      }
    },
    [],
  );

  // Seek via click na track (para div customizada)
  const handleSeekTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !duration || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      const time = percentage * duration;

      audio.currentTime = time;
      setCurrentTime(time);
    },
    [duration],
  );

  // Volume
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      setVolume(vol);
      const audio = audioRef.current;
      if (audio) {
        audio.volume = vol;
      }
    },
    [],
  );

  // Download
  const handleDownload = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !src || isDownloading) return;

    setIsDownloading(true);

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      objectUrls.current.add(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanup após pequeno delay para garantir o download
      setTimeout(() => {
        URL.revokeObjectURL(url);
        objectUrls.current.delete(url);
      }, 1000);
    } catch {
      // Fallback: abrir em nova aba
      window.open(src, '_blank');
    } finally {
      setIsDownloading(false);
    }
  }, [src, filename, isDownloading]);

  // Simular waveform bars quando playing
  useEffect(() => {
    if (!isPlaying) {
      setBarHeights(Array(BAR_COUNT).fill(MIN_BAR_HEIGHT));
      return;
    }

    const interval = setInterval(() => {
      setBarHeights((prev) =>
        prev.map(() => {
          const random = Math.random();
          // Distribuição: a maioria das barras fica entre 30%-100% do max
          const intensity = 0.3 + random * 0.7;
          return Math.round(
            MIN_BAR_HEIGHT + (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * intensity,
          );
        }),
      );
    }, 120);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Sincronizar estado do audio com o state do React
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [handleLoadedMetadata, handleTimeUpdate, handleEnded, handleError]);

  // Aplicar volume inicial
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ---------------------------------------------------------------------------
  // Renderização
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.container,
        animation: showSuccessPulse ? 'success-pulse 2s ease-out' : 'none',
      }}
      role="region"
      aria-label="Player de áudio"
    >
      {/* Elemento audio invisível */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* Waveform Visual */}
      <div style={styles.waveform} aria-hidden="true">
        {barHeights.map((height, index) => (
          <div
            key={index}
            style={{
              ...styles.bar,
              height: `${height}px`,
              animationDelay: `${index * 0.04}s`,
              animationPlayState: isPlaying ? 'running' : 'paused',
              opacity: isPlaying ? 1 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Controles */}
      <div style={styles.controls}>
        {/* Botão Play/Pause */}
        <button
          id="tts-audio-play-btn"
          style={{
            ...styles.playButton,
            background: isPlaying ? '#dc2626' : '#3b82f6',
          }}
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pausar' : PLAY_PAUSE_LABEL}
          tabIndex={0}
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>

        {/* Seek Bar */}
        <div style={styles.seekSection}>
          {/* Track clicável (fundo) */}
          <div
            id="tts-audio-seek-track"
            style={styles.seekTrack}
            onClick={handleSeekTrackClick}
            role="slider"
            aria-label="Progresso da reprodução"
            aria-valuenow={Math.round(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            tabIndex={0}
          >
            {/* Fundo vazio */}
            <div style={styles.seekTrackBg} />
            {/* Barra preenchida */}
            <div
              style={{
                ...styles.seekTrackFill,
                width: `${progressPercentage}%`,
              }}
            />
            {/* Thumb (bolinha) */}
            <div
              style={{
                ...styles.seekThumb,
                left: `${progressPercentage}%`,
              }}
            />
          </div>

          {/* Slider range invisível para acessibilidade */}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            style={styles.seekInput}
            aria-label="Barra de progresso"
          />
        </div>

        {/* Tempo */}
        <span style={styles.time} aria-live="polite">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Controles secundários: Volume + Download */}
      <div style={styles.secondaryControls}>
        {/* Slider de Volume */}
        <div style={styles.volumeSection}>
          <span style={styles.volumeIcon}>🔊</span>
          <input
            id="tts-audio-volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            style={styles.volumeSlider}
            aria-label={VOLUME_LABEL}
          />
        </div>

        {/* Botão Download */}
        <button
          id="tts-audio-download-btn"
          style={{
            ...styles.downloadButton,
            opacity: isDownloading ? 0.6 : 1,
            cursor: isDownloading ? 'not-allowed' : 'pointer',
          }}
          onClick={handleDownload}
          disabled={isDownloading}
          aria-label={DOWNLOAD_LABEL}
          tabIndex={0}
        >
          {isDownloading ? '⏳' : '⬇️'}{' '}
          {isDownloading ? 'Baixando...' : DOWNLOAD_LABEL}
        </button>
      </div>

      {/* Estilos CSS injetados */}
      <style>{`
        @keyframes waveformPulse {
          0%, 100% {
            transform: scaleY(0.6);
          }
          50% {
            transform: scaleY(1);
          }
        }

        #tts-audio-seek-track {
          position: relative;
          height: 6px;
          background: #374151;
          border-radius: 3px;
          cursor: pointer;
          transition: height 0.15s ease;
          overflow: visible;
        }

        #tts-audio-seek-track:hover {
          height: 8px;
        }

        #tts-audio-seek-track:hover #tts-audio-seek-thumb {
          transform: translate(-50%, -50%) scale(1.3);
        }

        #tts-audio-seek-input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          margin: 0;
          padding: 0;
        }

        #tts-audio-seek-input::-webkit-slider-thumb {
          opacity: 0;
          pointer-events: none;
        }

        #tts-audio-play-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
          outline: none;
        }

        #tts-audio-play-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }

        #tts-audio-play-btn:active {
          transform: scale(0.95);
        }

        #tts-audio-play-btn:focus-visible {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
        }

        #tts-audio-download-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #374151;
          background: #1f2937;
          color: #d1d5db;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
          outline: none;
          white-space: nowrap;
        }

        #tts-audio-download-btn:hover:not(:disabled) {
          background: #374151;
          border-color: #4b5563;
          color: #f3f4f6;
        }

        #tts-audio-download-btn:focus-visible {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }

        #tts-audio-download-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        #tts-audio-volume-slider {
          width: 100px;
          accent-color: #3b82f6;
          cursor: pointer;
        }

        #tts-audio-volume-slider::-webkit-slider-thumb {
          cursor: pointer;
        }

        @media (max-width: 520px) {
          #tts-audio-volume-slider {
            width: 60px;
          }
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
    padding: '20px 24px',
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    fontFamily: 'inherit',
  },

  // --- Waveform ---
  waveform: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 50,
    padding: '0 4px',
  },
  bar: {
    width: 4,
    borderRadius: 2,
    background: '#3b82f6',
    transition: 'height 0.1s ease',
    animation: 'waveformPulse 0.6s ease-in-out infinite',
    animationPlayState: 'paused',
    flexShrink: 0,
  },

  // --- Controles principais ---
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    cursor: 'pointer',
    transition:
      'transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease',
    outline: 'none',
    padding: 0,
  },
  seekSection: {
    flex: 1,
    minWidth: 120,
    maxWidth: 500,
    position: 'relative',
  },
  seekTrack: {
    position: 'relative',
    height: 6,
    background: '#374151',
    borderRadius: 3,
    cursor: 'pointer',
    overflow: 'visible',
    transition: 'height 0.15s ease',
  },
  seekTrackBg: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },
  seekTrackFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: '#3b82f6',
    borderRadius: 3,
    transition: 'width 0.05s linear',
  },
  seekThumb: {
    position: 'absolute',
    top: '50%',
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#f3f4f6',
    border: '2px solid #3b82f6',
    transform: 'translate(-50%, -50%) scale(1)',
    transition: 'transform 0.15s ease',
    pointerEvents: 'none',
    zIndex: 2,
  },
  seekInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
    margin: 0,
    padding: 0,
  },
  time: {
    fontSize: 13,
    fontWeight: 500,
    color: '#9ca3af',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    minWidth: 90,
    textAlign: 'right',
  },

  // --- Controles secundários ---
  secondaryControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  volumeSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  volumeIcon: {
    fontSize: 16,
    userSelect: 'none',
  },
  volumeSlider: {
    width: 100,
    accentColor: '#3b82f6',
    cursor: 'pointer',
  },
  downloadButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #374151',
    background: '#1f2937',
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition:
      'background 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease',
    outline: 'none',
    whiteSpace: 'nowrap',
  },
};
