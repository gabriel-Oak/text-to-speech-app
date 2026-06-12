'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GenerationStatus, Language } from '@/types/tts';

export interface UseTextToSpeechReturn {
  status: GenerationStatus;
  audioUrl: string | null;
  error: string | null;
  duration: number;
  generate: (text: string, voice: string, language: Language) => Promise<void>;
  reset: () => void;
}

/**
 * Hook que gerencia o ciclo de vida de geração de áudio via TTS.
 *
 * Fluxo:
 *  1. Usuário chama generate(text, voice, language)
 *  2. Status vai para Generating
 *  3. POST /api/tts/generate é chamado
 *  4. Se sucesso → Ready com audioUrl e duration
 *  5. Se falha → Error com mensagem
 *
 * Limpeza automática de object URLs para evitar memory leaks.
 */
export function useTextToSpeech(): UseTextToSpeechReturn {
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.Idle);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);

  // Rastreia todas as URLs criadas para revogação no cleanup
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Cleanup: revoga todas as object URLs montadas
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
  // Helper: registra uma nova object URL para rastreamento
  // ---------------------------------------------------------------------------
  const registerObjectUrl = useCallback(
    (url: string) => {
      // Revoke URL anterior se existir
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      objectUrlsRef.current.add(url);
      setAudioUrl(url);
    },
    [audioUrl],
  );

  // ---------------------------------------------------------------------------
  // generate: chama a API e processa a resposta
  // ---------------------------------------------------------------------------
  const generate = useCallback(
    async (text: string, voice: string, language: Language): Promise<void> => {
      // Validação básica no cliente
      if (!text || text.trim().length === 0) {
        setError('O texto não pode estar vazio.');
        setStatus(GenerationStatus.Error);
        return;
      }

      if (!voice || !language) {
        setError('Voz e idioma são obrigatórios.');
        setStatus(GenerationStatus.Error);
        return;
      }

      // Limpa estado anterior
      setError(null);
      setDuration(0);
      setStatus(GenerationStatus.Generating);

      try {
        const response = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice, language }),
        });

        if (!response.ok) {
          let errorMessage = 'Erro ao gerar áudio.';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = `Erro ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const audioBlob = await response.blob();
        const objectUrl = URL.createObjectURL(audioBlob);
        registerObjectUrl(objectUrl);

        // Tenta obter a duração via elemento <audio> oculto
        try {
          const audio = new Audio();
          audio.src = objectUrl;
          await new Promise<void>((resolve) => {
            audio.addEventListener('loadedmetadata', () => {
              setDuration(Math.round(audio.duration));
              resolve();
            });
            audio.addEventListener('error', () => {
              resolve(); // resolve mesmo sem duration, sem falhar o fluxo
            });
            // Timeout de segurança: se metadata não carregar em 3s, continua
            setTimeout(resolve, 3000);
          });
        } catch {
          // Ignora erros de metadados — o áudio já está pronto
        }

        setStatus(GenerationStatus.Ready);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erro desconhecido ao gerar áudio.';
        setError(message);
        setStatus(GenerationStatus.Error);
      }
    },
    [registerObjectUrl],
  );

  // ---------------------------------------------------------------------------
  // reset: volta ao estado inicial
  // ---------------------------------------------------------------------------
  const reset = useCallback(() => {
    // Revoke a URL atual antes de limpar
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      objectUrlsRef.current.delete(audioUrl);
    }
    setStatus(GenerationStatus.Idle);
    setAudioUrl(null);
    setError(null);
    setDuration(0);
  }, [audioUrl]);

  // ---------------------------------------------------------------------------
  // Retorno
  // ---------------------------------------------------------------------------
  return { status, audioUrl, error, duration, generate, reset };
}
