'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type StreamAudioStatus =
  | 'idle'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'ended';

export interface UseStreamAudioReturn {
  status: StreamAudioStatus;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  loadAudio: (url: string, autoPlay?: boolean) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  reset: () => void;
  audioUrl: string | null;
  audioElement: HTMLAudioElement | null;
}

/**
 * Hook que gerencia playback de áudio a partir de um stream (object URL).
 *
 * Fluxo de status:
 *   idle → buffering → idle (loaded) → playing → paused → ended
 *
 * Gerencia o ciclo de vida de um elemento <audio> nativo, incluindo:
 *  - Criação e cleanup de object URLs
 *  - Event listeners para metadata, timeupdate, ended, pause
 *  - Controle de play/pause/seek/reset
 *
 * IMPORTANTE: O elemento audio é criado dentro de loadAudio (lazy).
 * O componente consumidor (AudioPlayer) deve usar o audioElement exposto
 * para renderizar o <audio> e sincronizar o UI state.
 */
export function useStreamAudio(): UseStreamAudioReturn {
  const [status, setStatus] = useState<StreamAudioStatus>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Referência ao elemento audio nativo
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Rastreia object URLs para cleanup
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Controle de auto-play (mantido para compatibilidade, mas o play síncrono
  // agora é feito diretamente em loadAudio dentro do user gesture context)
  const autoPlayRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Cleanup: revoga todas as object URLs e destrói o elemento audio
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const audio = audioRef.current;
    const urls = objectUrlsRef.current;

    return () => {
      // Destroi o elemento audio
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.load();
      }

      // Revoga todas as object URLs
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Helpers de evento
  // ---------------------------------------------------------------------------

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration);
      // Auto-play já foi chamado sincronicamente em loadAudio.
      // Se o navegador bloqueou, tenta novamente aqui (fora do user gesture,
      // pode falhar, mas é a melhor chance restante).
      if (autoPlayRef.current) {
        autoPlayRef.current = false;
        audio.play().catch(() => {});
      }
      setStatus('idle');
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setStatus('ended');
    setIsPlaying(false);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    // Mantém o status como 'paused' (já é o estado atual ao pausar)
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleError = useCallback(() => {
    setStatus('idle');
    setIsPlaying(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Registrar object URL para cleanup
  // ---------------------------------------------------------------------------

  const registerObjectUrl = useCallback(
    (url: string) => {
      // Revoke URL anterior se existir
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        objectUrlsRef.current.delete(audioUrl);
      }
      objectUrlsRef.current.add(url);
      setAudioUrl(url);
    },
    [audioUrl],
  );

  // ---------------------------------------------------------------------------
  // loadAudio: carrega um URL no elemento audio
  // ---------------------------------------------------------------------------

  const loadAudio = useCallback(
    (url: string, autoPlay = false) => {
      // Revoke URL anterior
      registerObjectUrl(url);

      // Cria elemento audio se não existir
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio();
        audioRef.current = audio;
      }

      // Configura event listeners
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('error', handleError);

      // Define source e inicia carregamento
      audio.src = url;
      audio.preload = 'auto';

      // Marca auto-play (fallback para loadedmetadata callback)
      autoPlayRef.current = autoPlay;

      // Auto-play síncrono: chama play() DENTRO do contexto do user gesture.
      // Isso é essencial porque o navegador só permite autoplay quando o play()
      // é chamado diretamente como resultado de uma interação do usuário (click).
      // Se chamarmos play() em um callback assíncrono (setTimeout, Promise.then,
      // event listener), o navegador bloqueia.
      if (autoPlay) {
        audio.play().catch(() => {
          // Navegador bloqueou autoplay — o usuário precisa clicar no play
        });
      }

      // Muda status para buffering
      setStatus('buffering');
    },
    [
      registerObjectUrl,
      handleLoadedMetadata,
      handleTimeUpdate,
      handleEnded,
      handlePause,
      handlePlay,
      handleError,
    ],
  );

  // ---------------------------------------------------------------------------
  // Ações de playback
  // ---------------------------------------------------------------------------

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    setStatus('playing');
    audio.play().catch(() => {
      // Fallback: tenta novamente
      setStatus('idle');
    });
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setStatus('paused');
    audio.pause();
  }, []);

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      const clampedTime = Math.max(0, Math.min(time, duration));
      audio.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    },
    [duration],
  );

  const reset = useCallback(() => {
    const audio = audioRef.current;

    // Pausa e limpa o elemento audio
    if (audio) {
      audio.pause();
      audio.src = '';
      audio.load();
    }

    // Revoga a URL atual
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      objectUrlsRef.current.delete(audioUrl);
    }

    // Reseta estados
    setStatus('idle');
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setAudioUrl(null);
  }, [audioUrl]);

  // ---------------------------------------------------------------------------
  // Retorno
  // ---------------------------------------------------------------------------

  return {
    status,
    currentTime,
    duration,
    isPlaying,
    loadAudio,
    play,
    pause,
    seek,
    reset,
    audioUrl,
    audioElement: audioRef.current,
  };
}
