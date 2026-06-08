import { TTSClient, createTTSClient } from '@/lib/ttsClient';

describe('TTSClient', () => {
  describe('generate', () => {
    it('should call the TTS server with correct parameters', async () => {
      const client = new TTSClient({ baseUrl: 'http://localhost:8000' });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: () =>
          Promise.resolve(new Blob(['test audio'], { type: 'audio/wav' })),
      });

      const result = await client.generate({
        text: 'Hello world',
        voice: 'rafael',
        language: 'portuguese',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('text=Hello+world'),
      );
      expect(result).toBeInstanceOf(Blob);
    });

    it('should throw on non-ok response', async () => {
      const client = new TTSClient({ baseUrl: 'http://localhost:8000' });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      });

      await expect(client.generate({ text: 'Hello world' })).rejects.toThrow(
        'TTS request failed: Bad Request',
      );
    });
  });
});

describe('createTTSClient', () => {
  it('should use default URL when none provided', () => {
    const client = createTTSClient();
    expect(client).toBeInstanceOf(TTSClient);
  });

  it('should use provided baseUrl', () => {
    const client = createTTSClient({ baseUrl: 'http://custom:9000' });
    expect(client).toBeInstanceOf(TTSClient);
  });
});
