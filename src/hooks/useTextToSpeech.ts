'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseTextToSpeechReturn {
  generate: (options: {
    text: string;
    voiceName?: string;
    voiceFile?: File;
  }) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
  audioUrl: string | null;
  clearAudio: () => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioUrlRef = useRef<string | null>(null);
  audioUrlRef.current = audioUrl;

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const clearAudio = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    setAudioUrl(null);
    setError(null);
  }, []);

  const generate = useCallback(
    async (options: {
      text: string;
      voiceName?: string;
      voiceFile?: File;
    }): Promise<void> => {
      if (options.voiceName && options.voiceFile) {
        setError('Cannot provide both voiceName and voiceFile');
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        let body: BodyInit;

        if (options.voiceFile) {
          const formData = new FormData();
          formData.append('text', options.text);
          formData.append('voiceFile', options.voiceFile);
          body = formData;
        } else {
          body = JSON.stringify({
            text: options.text,
            ...(options.voiceName && { voiceName: options.voiceName }),
          });
        }

        const response = await fetch('/api/tts', {
          method: 'POST',
          body,
        });

        if (!response.ok) {
          throw new Error(
            `Server error: ${response.status} ${response.statusText}`,
          );
        }

        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  return {
    generate,
    isGenerating,
    error,
    audioUrl,
    clearAudio,
  };
}
