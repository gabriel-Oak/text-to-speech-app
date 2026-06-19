'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

const BAR_COUNT = 28;
const MIN_BAR_HEIGHT = 3;
const MAX_BAR_HEIGHT = 32;

// shared fallback state for media elements
const _audioDuration = 0;

// ---------------------------------------------------------------------------
// Helpers
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

export default function MediaPreview({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [barHeights, setBarHeights] = useState<number[]>(() =>
    Array(BAR_COUNT).fill(MIN_BAR_HEIGHT),
  );

  // Cleanup element
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  // Handler de erro inline — captura erros antes que virem unhandledRejection
  const handleAudioError = useCallback(() => {
    const audio = audioRef.current;
    if (audio?.error) {
      console.error(
        'Erro ao carregar áudio:',
        audio.error.code,
        audio.error.message,
      );
    }
  }, []);

  // Metadata & time listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Volume
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

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

  // Play / Pause
  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error('Erro ao reproduzir áudio:', err);
      });
    }
  }, [playing]);

  // Seek via click na track
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

  // Seek via range input
  const handleSeekChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);
      const audio = audioRef.current;
      if (audio) audio.currentTime = time;
    },
    [],
  );

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Elemento audio oculto */}
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        style={{ display: 'none' }}
        onError={handleAudioError}
      />

      <div ref={containerRef} role="region" aria-label="Preview do áudio">
        {/* Waveform Visual */}
        <div className="mp-waveform" aria-hidden="true">
          {barHeights.map((height, index) => (
            <div
              key={index}
              className={`mp-bar ${playing ? 'active' : ''}`}
              style={{ height: `${height}px` }}
            />
          ))}
        </div>

        {/* Controles principais */}
        <div className="mp-controls-row">
          {/* Botão Play/Pause */}
          <button
            id="media-preview-play-btn"
            className="mp-play-btn"
            style={{
              background: playing ? '#dc2626' : '#3b82f6',
              color: '#ffffff',
            }}
            onClick={handlePlayPause}
            aria-label={playing ? 'Pausar' : 'Reproduzir'}
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
          <div className="mp-seek-section">
            <div
              id="media-preview-seek-track"
              className="mp-seek-track"
              onClick={handleSeekTrackClick}
              role="slider"
              aria-label="Progresso da reprodução"
              aria-valuenow={Math.round(currentTime)}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              tabIndex={0}
            >
              <div
                className="mp-seek-fill"
                style={{ width: `${progressPercentage}%` }}
              />
              <div
                className="mp-seek-thumb"
                style={{ left: `${progressPercentage}%` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeekChange}
              className="mp-seek-input"
              aria-label="Barra de progresso"
            />
          </div>

          {/* Tempo */}
          <span className="mp-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Controles secundários */}
        <div className="mp-secondary-row">
          <div className="mp-volume-section">
            <span className="mp-vol-icon">🔊</span>
            <input
              id="media-preview-volume-slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="mp-volume-slider"
              aria-label="Volume"
            />
          </div>
        </div>

        {/* Estilos CSS injetados */}
        <style>{`
          .mp-waveform {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 3px;
            height: 50px;
            padding: 0 4px;
          }

          .mp-bar {
            width: 4px;
            border-radius: 2px;
            background: #3b82f6;
            transition: height 0.1s ease, opacity 0.15s ease;
            animation: mpWaveformPulse 0.6s ease-in-out infinite;
            animation-play-state: paused;
            flex-shrink: 0;
          }

          .mp-bar.active {
            animation-play-state: running;
            opacity: 1;
          }

          @keyframes mpWaveformPulse {
            0%, 100% { transform: scaleY(0.6); }
            50%      { transform: scaleY(1);    }
          }

          .mp-controls-row {
            display: flex;
            align-items: center;
            gap: 14px;
            flex-wrap: wrap;
            margin-bottom: 8px;
          }

          /* Botão play/pause — ícones brancos por padrão via color() hack */
          .mp-play-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
            outline: none;
          }

          .mp-play-btn:hover {
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          }

          .mp-play-btn:focus-visible {
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
          }

          /* Seek bar container */
          .mp-seek-section {
            flex: 1;
            min-width: 120px;
            max-width: 500px;
            position: relative;
          }

          .mp-seek-track {
            position: relative;
            height: 6px;
            background: #374151;
            border-radius: 3px;
            cursor: pointer;
            overflow: visible;
            transition: height 0.15s ease;
          }

          .mp-seek-track:hover {
            height: 8px;
          }

          .mp-seek-fill {
            position: absolute;
            top: 0; left: 0;
            height: 100%;
            background: #3b82f6;
            border-radius: 3px;
            transition: width 0.05s linear;
          }

          .mp-seek-thumb {
            position: absolute;
            top: '50%';
            width: 14px;
            height: 14px;
            border-radius: '50%';
            background: '#f3f4f6';
            border: '2px solid #3b82f6';
            transform: translate(-50%, -50%) scale(1);
            transition: transform 0.15s ease;
            z-index: 2;
          }

          .mp-seek-input {
            position: absolute;
            top: 0; left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
            margin: 0;
            padding: 0;
          }

          .mp-time {
            font-size: 13px;
            font-weight: 500;
            color: #9ca3af;
            white-space: nowrap;
            min-width: 90px;
            text-align: right;
          }

          .mp-secondary-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
          }

          .mp-volume-section {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .mp-vol-icon {
            font-size: 16px;
            user-select: none;
          }

          .mp-volume-slider {
            width: 100px;
            accent-color: #3b82f6;
            cursor: pointer;
          }

          @media (max-width: 520px) {
            .mp-volume-slider {
              width: 60px;
            }
          }
        `}</style>
      </div>
    </>
  );
}
