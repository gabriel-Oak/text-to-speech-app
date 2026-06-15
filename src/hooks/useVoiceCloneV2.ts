'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GenerationStatus = 'idle' | 'generating' | 'ready' | 'error';

export interface AudioState {
  audioUrl: string;
}

export interface VoiceCloneV2State {
  text: string;
  selectedVoice: string | null;
  uploadedAudio: File | null;
  isGenerating: boolean;
  error: string | null;
  audioUrl: string | null;
  generationStatus: GenerationStatus;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook que gerencia o ciclo de vida de geração de áudio via Voice Clone v2.
 *
 * Fluxo:
 *  1. Usuário preenche texto e seleciona uma voz (builtin/custom) ou upload de áudio
 *  2. Dependência entre campos:
 *     - selectedVoice preenchido → upload desabilitado
 *     - uploadedAudio selecionado → voice selector desabilitado
 *  3. Ao gerar, chama POST /api/tts/generate-v2
 *  4. Se sucesso → ready com audioUrl
 *  5. Se falha → error com mensagem
 *
 * Limpeza automática de object URLs para evitar memory leaks.
 */
export function useVoiceCloneV2(): {
  state: VoiceCloneV2State;
  generateAudio: () => Promise<AudioState>;
  reset: () => void;
  setText: (text: string) => void;
  setSelectedVoice: (voice: string | null) => void;
  setUploadedAudio: (file: File | null) => void;
  disabledVoiceSelector: boolean;
  disabledUpload: boolean;
} {
  const [text, setTextState] = useState<string>('');
  const [selectedVoice, setSelectedVoiceState] = useState<string | null>(null);
  const [uploadedAudio, setUploadedAudioState] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>('idle');

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
        objectUrlsRef.current.delete(audioUrl);
      }
      objectUrlsRef.current.add(url);
      setAudioUrl(url);
    },
    [audioUrl],
  );

  // ---------------------------------------------------------------------------
  // Dependências entre campos
  // ---------------------------------------------------------------------------
  // Voice selector desabilitado quando há áudio de clonagem selecionado
  const disabledVoiceSelector = uploadedAudio !== null;
  // Upload desabilitado quando há uma voz selecionada (builtin ou custom)
  const disabledUpload = selectedVoice !== null;

  // ---------------------------------------------------------------------------
  // Setters com cleanup de estado
  // ---------------------------------------------------------------------------
  const setText = useCallback(
    (value: string) => {
      setTextState(value);
      // Limpa erro ao usuário começar a digitar novamente
      if (error) {
        setError(null);
      }
    },
    [error],
  );

  const setSelectedVoice = useCallback(
    (voice: string | null) => {
      setSelectedVoiceState(voice);
      // Se selecionou uma voz, limpa áudio de clonagem
      if (voice !== null) {
        setUploadedAudioState(null);
      }
      // Limpa erro ao trocar seleção
      if (error) {
        setError(null);
      }
    },
    [error],
  );

  const setUploadedAudio = useCallback(
    (file: File | null) => {
      setUploadedAudioState(file);
      // Se selecionou áudio, limpa voz selecionada
      if (file !== null) {
        setSelectedVoiceState(null);
      }
      // Limpa erro ao trocar seleção
      if (error) {
        setError(null);
      }
    },
    [error],
  );

  // ---------------------------------------------------------------------------
  // generateAudio: valida, chama API e processa resposta
  // ---------------------------------------------------------------------------
  const generateAudio = useCallback(async (): Promise<AudioState> => {
    // Validação: texto preenchido
    if (!text || text.trim().length === 0) {
      const msg = 'O texto não pode estar vazio.';
      setError(msg);
      setGenerationStatus('error');
      throw new Error(msg);
    }

    // Validação: pelo menos uma voz ou upload selecionado
    if (!selectedVoice && !uploadedAudio) {
      const msg = 'Selecione uma voz ou faça upload de um áudio para clonagem.';
      setError(msg);
      setGenerationStatus('error');
      throw new Error(msg);
    }

    // Validação de formato se houver upload
    if (uploadedAudio) {
      const fileName = uploadedAudio.name.toLowerCase();
      const ext = fileName.split('.').pop() || '';
      const allowedExtensions = ['wav', 'mp3'];

      if (!allowedExtensions.includes(ext)) {
        const msg = `Formato não suportado. Aceita apenas .wav ou .mp3 (recebido: .${ext})`;
        setError(msg);
        setGenerationStatus('error');
        throw new Error(msg);
      }
    }

    // Limpa estado anterior
    setError(null);
    setAudioUrl(null);
    setIsGenerating(true);
    setGenerationStatus('generating');

    try {
      const formData = new FormData();
      formData.append('text', text.trim());

      if (selectedVoice) {
        formData.append('voice', selectedVoice);
      }

      if (uploadedAudio) {
        formData.append('audio', uploadedAudio);
      }

      const response = await fetch('/api/tts/generate-v2', {
        method: 'POST',
        body: formData,
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

      setIsGenerating(false);
      setGenerationStatus('ready');

      return { audioUrl: objectUrl };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro desconhecido ao gerar áudio.';
      setError(message);
      setIsGenerating(false);
      setGenerationStatus('error');
      throw err;
    }
  }, [text, selectedVoice, uploadedAudio, registerObjectUrl]);

  // ---------------------------------------------------------------------------
  // reset: volta ao estado inicial
  // ---------------------------------------------------------------------------
  const reset = useCallback(() => {
    // Revoke a URL atual se existir
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      objectUrlsRef.current.delete(audioUrl);
    }
    setTextState('');
    setSelectedVoiceState(null);
    setUploadedAudioState(null);
    setIsGenerating(false);
    setAudioUrl(null);
    setError(null);
    setGenerationStatus('idle');
  }, [audioUrl]);

  // ---------------------------------------------------------------------------
  // Retorno
  // ---------------------------------------------------------------------------
  return {
    state: {
      text,
      selectedVoice,
      uploadedAudio,
      isGenerating,
      error,
      audioUrl,
      generationStatus,
    },
    generateAudio,
    reset,
    setText,
    setSelectedVoice,
    setUploadedAudio,
    disabledVoiceSelector,
    disabledUpload,
  };
}
