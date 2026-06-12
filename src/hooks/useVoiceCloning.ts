'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language, Voice } from '@/types/tts';

export type CloningStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error';
export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface UseVoiceCloningReturn {
  voices: Voice[];
  cloningStatus: CloningStatus;
  loadingState: LoadingState;
  currentFile: File | null;
  currentFileUrl: string | null;
  error: string | null;
  exportVoice: (file: File, name: string, language: Language) => Promise<Voice>;
  refreshVoices: () => Promise<void>;
  setCurrentFile: (file: File | null) => void;
}

/**
 * Hook que gerencia o ciclo de vida de vozes clonadas.
 *
 * Fluxo:
 *  1. Ao montar, carrega a lista de vozes via GET /api/voices/list
 *  2. O consumidor seleciona um arquivo de áudio → setCurrentFile
 *  3. Ao clonar, chama exportVoice → POST /api/tts/voice/export
 *     → status: uploading → processing → success/error
 *  4. refreshVoices recarrega a lista de vozes
 *
 * Limpeza automática de object URLs para evitar memory leaks.
 */
export function useVoiceCloning(): UseVoiceCloningReturn {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [cloningStatus, setCloningStatus] = useState<CloningStatus>('idle');
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [currentFile, setCurrentFileState] = useState<File | null>(null);
  const [currentFileUrl, setCurrentFileUrlState] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Rastreia URLs de objeto para revogação no cleanup
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Cleanup: revoga todas as object URLs montadas (currentFileUrl + vozes preview)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // registerObjectUrl: registra URL para rastreamento e revogação posterior
  // ---------------------------------------------------------------------------
  const registerObjectUrl = useCallback((url: string) => {
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  // ---------------------------------------------------------------------------
  // setCurrentFile: define o arquivo atual e gera uma preview URL
  // ---------------------------------------------------------------------------
  const setCurrentFile = useCallback(
    (file: File | null) => {
      // Se havia um currentFileUrl anterior, revoga
      if (currentFileUrl) {
        URL.revokeObjectURL(currentFileUrl);
        objectUrlsRef.current.delete(currentFileUrl);
      }

      setCurrentFileState(file);

      if (file) {
        const url = URL.createObjectURL(file);
        registerObjectUrl(url);
        setCurrentFileUrlState(url);
      } else {
        setCurrentFileUrlState(null);
      }

      // Limpa erros e status ao trocar de arquivo
      setError(null);
      setCloningStatus('idle');
    },
    [currentFileUrl, registerObjectUrl],
  );

  // ---------------------------------------------------------------------------
  // refreshVoices: recarrega a lista de vozes disponíveis
  // ---------------------------------------------------------------------------
  const refreshVoices = useCallback(async () => {
    setLoadingState('loading');
    try {
      const response = await fetch('/api/voices/list', {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        let errorMessage = 'Erro ao carregar lista de vozes.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setVoices(data.voices ?? []);
      setLoadingState('loaded');
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro desconhecido ao carregar vozes.';
      setError(message);
      setLoadingState('error');
      throw err;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // exportVoice: faz upload do áudio e clona a voz
  //
  // Estados: idle → uploading → processing → success | error
  // ---------------------------------------------------------------------------
  const exportVoice = useCallback(
    async (file: File, name: string, language: Language): Promise<Voice> => {
      // Validação básica no cliente
      if (!file) {
        throw new Error('Nenhum arquivo selecionado para clonagem.');
      }

      if (!name || name.trim().length === 0) {
        throw new Error('O nome da voz não pode estar vazio.');
      }

      if (!language) {
        throw new Error('O idioma é obrigatório.');
      }

      // Validação de formato do arquivo
      const fileName = file.name.toLowerCase();
      const ext = fileName.split('.').pop() || '';
      const allowedExtensions = ['wav', 'mp3'];

      if (!allowedExtensions.includes(ext)) {
        throw new Error(
          `Formato não suportado. Aceita apenas .wav ou .mp3 (recebido: .${ext})`,
        );
      }

      // Limpa estado anterior
      setError(null);
      setCloningStatus('uploading');

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name.trim());
        formData.append('language', language);

        // Fase 1: upload (uploading)
        const response = await fetch('/api/tts/voice/export', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = 'Erro ao exportar voz.';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = `Erro ${response.status}: ${response.statusText}`;
          }
          setError(errorMessage);
          setCloningStatus('error');
          throw new Error(errorMessage);
        }

        // Fase 2: processando (processing) — aguarda o safetensors ser gerado
        setCloningStatus('processing');

        const data = await response.json();

        // Constrói o Voice retornado a partir da resposta da API
        const clonedVoice: Voice = {
          id: data.voiceId,
          name: data.name,
          language: language,
          type: 'cloned',
          safetensorsPath: data.safetensorsPath,
        };

        // Atualiza para sucesso
        setCloningStatus('success');
        setError(null);

        return clonedVoice;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erro desconhecido ao clonar voz.';
        setError(message);
        setCloningStatus('error');
        throw err;
      }
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Fetch inicial: carrega vozes ao montar o componente
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await refreshVoices();
      } catch {
        if (!cancelled) {
          setLoadingState('error');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Reset: volta ao estado inicial
  // ---------------------------------------------------------------------------
  const _reset = useCallback(() => {
    // Revoke currentFileUrl se existir
    if (currentFileUrl) {
      URL.revokeObjectURL(currentFileUrl);
      objectUrlsRef.current.delete(currentFileUrl);
    }

    setCurrentFileState(null);
    setCurrentFileUrlState(null);
    setError(null);
    setCloningStatus('idle');
    setLoadingState('idle');
  }, [currentFileUrl]);

  // ---------------------------------------------------------------------------
  // Retorno
  // ---------------------------------------------------------------------------
  return {
    voices,
    cloningStatus,
    loadingState,
    currentFile,
    currentFileUrl,
    error,
    exportVoice,
    refreshVoices,
    setCurrentFile,
  };
}
