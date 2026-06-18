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
  audioBlob?: Blob | null; // blob cru para download (evita revogação prematura)
  audioElement?: HTMLAudioElement | null; // elemento audio do useStreamAudio
  onEnded?: () => void;
  showSuccessPulse?: boolean; // animação de sucesso ao montar
  isPlaying?: boolean; // estado de playback vindo do hook
  onPlayPause?: () => void; // callback para play/pause
  currentTime?: number; // tempo atual vindo do hook
  duration?: number; // duração vindoo hook
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
  audioBlob,
  audioElement,
  onEnded,
  showSuccessPulse = false,
  isPlaying: externalIsPlaying,
  onPlayPause,
  currentTime: externalCurrentTime,
  duration: externalDuration,
}: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Estado interno (fallback quando não há dados externos)
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [barHeights, setBarHeights] = useState<number[]>(() =>
    Array(BAR_COUNT).fill(MIN_BAR_HEIGHT),
  );
  const [isDownloading, setIsDownloading] = useState(false);

  // Cleanup de object URLs
  const objectUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    const urls = objectUrls.current;
    if (src.startsWith('blob:')) {
      urls.add(src);
    }
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, [src]);

  // Valores externos ou internos
  const playing =
    externalIsPlaying !== undefined ? externalIsPlaying : localIsPlaying;
  const currentTime =
    externalCurrentTime !== undefined ? externalCurrentTime : localCurrentTime;
  const duration =
    externalDuration !== undefined ? externalDuration : localDuration;

  // Callbacks do elemento audio
  /* eslint-disable react-hooks/exhaustive-deps */
  const getAudio = () => audioElement || null;

  const handleLoadedMetadata = useCallback(() => {
    const audio = getAudio();
    if (audio && externalDuration === undefined) {
      setLocalDuration(audio.duration);
    }
  }, [externalDuration]);

  const handleTimeUpdate = useCallback(() => {
    const audio = getAudio();
    if (audio && externalCurrentTime === undefined) {
      setLocalCurrentTime(audio.currentTime);
    }
  }, [externalCurrentTime]);

  const handleEnded = useCallback(() => {
    if (externalIsPlaying !== undefined) {
      setLocalCurrentTime(0);
    } else {
      setLocalIsPlaying(false);
      setLocalCurrentTime(0);
    }
    if (onEnded) onEnded();
  }, [onEnded, externalIsPlaying]);

  const handleError = useCallback(() => {
    if (externalIsPlaying === undefined) {
      setLocalIsPlaying(false);
    }
  }, [externalIsPlaying]);

  // Play / Pause
  const handlePlayPause = useCallback(() => {
    if (onPlayPause) {
      onPlayPause();
      return;
    }
    const audio = getAudio();
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  }, [onPlayPause, playing]);

  // Seek
  const handleSeekChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setLocalCurrentTime(time);
      const audio = getAudio();
      if (audio) audio.currentTime = time;
    },
    [],
  );

  // Seek via click na track
  const handleSeekTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = getAudio();
      if (!audio || !duration || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      const time = percentage * duration;

      audio.currentTime = time;
      setLocalCurrentTime(time);
    },
    [duration],
  );

  // Volume
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      setVolume(vol);
      const audio = getAudio();
      if (audio) audio.volume = vol;
    },
    [],
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  // Download
  const handleDownload = useCallback(async () => {
    if (!src || isDownloading) return;
    setIsDownloading(true);

    try {
      // Se temos o blob cru disponível, usamos ele diretamente para criar
      // um novo object URL. Isso evita o fetch que pode falhar com blob URLs.
      let blobToDownload: Blob;
      if (audioBlob) {
        blobToDownload = audioBlob;
      } else {
        // Fallback: busca o blob via fetch
        const response = await fetch(src);
        if (!response.ok) throw new Error('Failed to fetch audio blob');
        blobToDownload = await response.blob();
      }

      const downloadUrl = URL.createObjectURL(blobToDownload);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Revoga o URL temporário após garantir que o download foi iniciado.
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 3000);
    } catch {
      // Fallback final: abre o src em nova aba
      const a = document.createElement('a');
      a.href = src;
      a.download = filename;
      a.target = '_blank';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  }, [src, filename, audioBlob, isDownloading]);

  // Waveform bars animation
  useEffect(() => {
    if (!playing) {
      setBarHeights(Array(BAR_COUNT).fill(MIN_BAR_HEIGHT));
      return;
    }
    const interval = setInterval(() => {
      setBarHeights((prev) =>
        prev.map(() => {
          const intensity = 0.3 + Math.random() * 0.7;
          return Math.round(
            MIN_BAR_HEIGHT + (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * intensity,
          );
        }),
      );
    }, 120);
    return () => clearInterval(interval);
  }, [playing]);

  // Attach event listeners to audio element
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const audio = getAudio();
    if (!audio) return;

    const onPlay = () => {
      if (externalIsPlaying === undefined) setLocalIsPlaying(true);
    };
    const onPause = () => {
      if (externalIsPlaying === undefined) setLocalIsPlaying(false);
    };

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
  }, [
    handleLoadedMetadata,
    handleTimeUpdate,
    handleEnded,
    handleError,
    externalIsPlaying,
  ]);

  // Apply volume
  useEffect(() => {
    const audio = getAudio();
    if (audio) audio.volume = volume;
  }, [volume]);
  /* eslint-enable react-hooks/exhaustive-deps */

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
      {/* Waveform Visual */}
      <div style={styles.waveform} aria-hidden="true">
        {barHeights.map((height, index) => (
          <div
            key={index}
            style={{
              ...styles.bar,
              height: `${height}px`,
              animationDelay: `${index * 0.04}s`,
              animationPlayState: playing ? 'running' : 'paused',
              opacity: playing ? 1 : 0.3,
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
            background: playing ? '#dc2626' : '#3b82f6',
            color: '#ffffff',
          }}
          onClick={handlePlayPause}
          aria-label={playing ? 'Pausar' : PLAY_PAUSE_LABEL}
          tabIndex={0}
        >
          <>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              style={{
                display: 'inline-flex',
                verticalAlign: 'middle',
                fontSize: '16px',
              }}
              aria-hidden="true"
            >
              {!playing && (
                <polygon points="8,5 19,13 8,19" fill="currentColor" />
              )}
              {playing && (
                <>
                  <rect
                    x="6"
                    y="4.5"
                    width="4"
                    height="15"
                    rx="1"
                    fill="currentColor"
                  />
                  <rect
                    x="14"
                    y="4.5"
                    width="4"
                    height="15"
                    rx="1"
                    fill="currentColor"
                  />
                </>
              )}
            </svg>
          </>
        </button>

        {/* Seek Bar */}
        <div style={styles.seekSection}>
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
            <div style={styles.seekTrackBg} />
            <div
              style={{
                ...styles.seekTrackFill,
                width: `${progressPercentage}%`,
              }}
            />
            <div
              style={{
                ...styles.seekThumb,
                left: `${progressPercentage}%`,
              }}
            />
          </div>

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

      {/* Controles secundários */}
      <div style={styles.secondaryControls}>
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
    gap: 8,
    fontFamily: 'inherit',
  },

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
