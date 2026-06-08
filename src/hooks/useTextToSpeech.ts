'use client';

export function useTextToSpeech() {
  const generate = async (_text: string): Promise<Blob> => {
    throw new Error('Not implemented');
  };

  return { generate };
}
