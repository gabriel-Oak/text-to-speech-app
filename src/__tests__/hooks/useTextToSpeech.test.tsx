import { renderHook, act } from '@testing-library/react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

// Mock URL methods
beforeAll(() => {
  (global as any).URL.createObjectURL = jest.fn(
    () => 'http://mocked.audio/url',
  );
  (global as any).URL.revokeObjectURL = jest.fn();
});

describe('useTextToSpeech', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start with correct initial state', () => {
    const { result } = renderHook(() => useTextToSpeech());

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.audioUrl).toBeNull();
  });

  it('should generate audio successfully with voiceName', async () => {
    const mockBlob = new Blob(['test audio'], { type: 'audio/wav' });
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.generate({
        text: 'Hello world',
        voiceName: 'anna',
      });
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.audioUrl).toBe('http://mocked.audio/url');
    expect((global as any).fetch).toHaveBeenCalledWith('/api/tts', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Hello world',
        voiceName: 'anna',
      }),
    });
  });

  it('should generate audio successfully without voiceName (default voice)', async () => {
    const mockBlob = new Blob(['test audio'], { type: 'audio/wav' });
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.generate({
        text: 'Hello world',
      });
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.audioUrl).toBe('http://mocked.audio/url');
    expect((global as any).fetch).toHaveBeenCalledWith('/api/tts', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Hello world',
      }),
    });
  });

  it('should generate audio successfully with voiceFile (form-data)', async () => {
    const mockBlob = new Blob(['test audio'], { type: 'audio/wav' });
    const mockFile = new File(['sample audio'], 'sample.wav', {
      type: 'audio/wav',
    });

    let capturedBody: FormData | null = null;
    (global as any).fetch = jest
      .fn()
      .mockImplementation(async (url: string, options: any) => {
        capturedBody = options.body as FormData;
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        });
      });

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.generate({
        text: 'Clone voice',
        voiceFile: mockFile,
      });
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.audioUrl).toBe('http://mocked.audio/url');
    expect(capturedBody).toBeInstanceOf(FormData);
    expect((capturedBody as any).get('text')).toBe('Clone voice');
  });

  it('should set error when both voiceName and voiceFile are provided', async () => {
    const mockFile = new File(['sample'], 'sample.wav', { type: 'audio/wav' });

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.generate({
        text: 'Test',
        voiceName: 'anna',
        voiceFile: mockFile,
      });
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBe(
      'Cannot provide both voiceName and voiceFile',
    );
    expect(result.current.audioUrl).toBeNull();
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('should set error when server returns non-ok response', async () => {
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.generate({ text: 'Hello world', voiceName: 'anna' });
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toContain('Server error: 500');
    expect(result.current.audioUrl).toBeNull();
  });

  it('should set error when fetch throws (network error)', async () => {
    (global as any).fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network request failed'));

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.generate({ text: 'Hello world' });
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBe('Network request failed');
    expect(result.current.audioUrl).toBeNull();
  });

  it('should handle unexpected error type', async () => {
    (global as any).fetch = jest.fn().mockRejectedValueOnce('not an error');

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.generate({ text: 'Hello world' });
    });

    expect(result.current.error).toBe('An unexpected error occurred');
  });

  it('should clear audio when clearAudio is called', () => {
    const { result } = renderHook(() => useTextToSpeech());

    act(() => {
      result.current.clearAudio();
    });

    expect(result.current.error).toBeNull();
  });

  it('should call clearAudio without error', () => {
    const { result } = renderHook(() => useTextToSpeech());

    expect(() => {
      act(() => {
        result.current.clearAudio();
      });
    }).not.toThrow();

    expect(result.current.error).toBeNull();
  });

  it('should set isGenerating during generation and reset after', async () => {
    const mockBlob = new Blob(['test'], { type: 'audio/wav' });
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const { result } = renderHook(() => useTextToSpeech());

    expect(result.current.isGenerating).toBe(false);

    await act(async () => {
      await result.current.generate({ text: 'Hello', voiceName: 'anna' });
    });

    // After completion, isGenerating should be false
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.audioUrl).toBe('http://mocked.audio/url');
  });

  it('should revoke old blob URL when new audio is generated', async () => {
    const mockBlob = new Blob(['test'], { type: 'audio/wav' });
    let callCount = 0;
    (global as any).URL.createObjectURL = jest.fn(() => {
      callCount++;
      return `http://mocked.audio/url${callCount}`;
    });

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const { result } = renderHook(() => useTextToSpeech());

    // Generate first audio
    await act(async () => {
      await result.current.generate({ text: 'First' });
    });

    const firstUrl = result.current.audioUrl;

    // Generate second audio
    await act(async () => {
      await result.current.generate({ text: 'Second' });
    });

    // The old URL should have been revoked
    expect((global as any).URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
  });
});
