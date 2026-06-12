import { renderHook, act } from '@testing-library/react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { GenerationStatus, Language } from '@/types/tts';

// ---------------------------------------------------------------------------
// Mocks globais
// ---------------------------------------------------------------------------

const mockCreateObjectURL = jest.fn<string, [Blob]>();
const mockRevokeObjectURL = jest.fn<string, [string]>();

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  mockCreateObjectURL.mockReturnValue('https://mocked.url/audio.wav');
  globalThis.URL.createObjectURL = mockCreateObjectURL;
  globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

  // AbortSignal.timeout não existe no jsdom
  interface AbortSignalWithTimeout extends AbortSignal {
    timeout?: () => AbortSignal;
  }
  const _AS = AbortSignal as AbortSignalWithTimeout;
  if (!_AS.timeout) {
    _AS.timeout = () => new AbortController().signal;
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();

  // Substituir setTimeout global para resolver imediatamente.
  // Isso evita o timeout de 3s do hook (safety timeout no carregamento de metadados).
  jest.spyOn(global, 'setTimeout').mockImplementation((cb: () => void) => {
    Promise.resolve().then(cb);
    return undefined;
  });
});

afterEach(() => {
  // Restaura setTimeout original
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderUseTextToSpeech() {
  return renderHook(() => useTextToSpeech());
}

function mockSuccessFetch() {
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockResolvedValueOnce({
    ok: true,
    blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/wav' })),
  } as Response);
}

function mockErrorFetch(
  status: number,
  statusText: string,
  jsonPayload?: unknown,
) {
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve(jsonPayload),
  } as Response);
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------
describe('useTextToSpeech', () => {
  describe('estado inicial', () => {
    it('deve iniciar com status Idle', () => {
      const { result } = renderUseTextToSpeech();
      expect(result.current.status).toBe(GenerationStatus.Idle);
    });

    it('deve iniciar com audioUrl null', () => {
      const { result } = renderUseTextToSpeech();
      expect(result.current.audioUrl).toBeNull();
    });

    it('deve iniciar com error null', () => {
      const { result } = renderUseTextToSpeech();
      expect(result.current.error).toBeNull();
    });

    it('deve iniciar com duration 0', () => {
      const { result } = renderUseTextToSpeech();
      expect(result.current.duration).toBe(0);
    });
  });

  describe('generate — sucesso', () => {
    it('deve mudar status para Ready ao concluir com sucesso', async () => {
      mockSuccessFetch();

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test-voice', 'english');
      });

      expect(result.current.status).toBe(GenerationStatus.Ready);
    });

    it('deve criar object URL para o áudio', async () => {
      mockSuccessFetch();

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test-voice', 'english');
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(result.current.audioUrl).toBe('https://mocked.url/audio.wav');
    });

    it('deve POST para /api/tts/generate com corpo correto', async () => {
      mockSuccessFetch();

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('Olá mundo', 'rafael', 'portuguese');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tts/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'Olá mundo',
            voice: 'rafael',
            language: 'portuguese',
          }),
        }),
      );
    });

    it('deve resetar duration e error antes de uma nova chamada', async () => {
      mockSuccessFetch();

      const { result } = renderUseTextToSpeech();

      // Primeira chamada
      await act(async () => {
        await result.current.generate('primeiro', 'test', 'english');
      });
      expect(result.current.status).toBe(GenerationStatus.Ready);

      // Segunda chamada — deve limpar estado anterior antes de gerar
      mockSuccessFetch();
      await act(async () => {
        await result.current.generate('segundo', 'test', 'english');
      });

      expect(result.current.status).toBe(GenerationStatus.Ready);
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
    });
  });

  describe('generate — erros', () => {
    it('deve rejeitar se texto estiver vazio', async () => {
      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('', 'test-voice', 'english');
      });

      expect(result.current.status).toBe(GenerationStatus.Error);
      expect(result.current.error).toBe('O texto não pode estar vazio.');
      expect(result.current.audioUrl).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve tratar texto com apenas espaços como vazio', async () => {
      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('   ', 'test-voice', 'english');
      });

      expect(result.current.status).toBe(GenerationStatus.Error);
      expect(result.current.error).toBe('O texto não pode estar vazio.');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve rejeitar se voz não informada', async () => {
      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', '', 'english');
      });

      expect(result.current.status).toBe(GenerationStatus.Error);
      expect(result.current.error).toBe('Voz e idioma são obrigatórios.');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve rejeitar se idioma não informado', async () => {
      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test-voice', '' as Language);
      });

      expect(result.current.status).toBe(GenerationStatus.Error);
      expect(result.current.error).toBe('Voz e idioma são obrigatórios.');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve tratar erro quando API retorna 400', async () => {
      mockErrorFetch(400, 'Bad Request', { error: 'Texto muito longo' });

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test-voice', 'english');
      });

      expect(result.current.status).toBe(GenerationStatus.Error);
      expect(result.current.error).toBe('Texto muito longo');
      expect(result.current.audioUrl).toBeNull();
    });

    it('deve tratar erro quando API retorna 500 com mensagem genérica', async () => {
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Não é JSON')),
      } as Response);

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test-voice', 'english');
      });

      expect(result.current.status).toBe(GenerationStatus.Error);
      expect(result.current.error).toContain('500');
      expect(result.current.audioUrl).toBeNull();
    });

    it('deve tratar erro quando API retorna 500 com JSON de erro', async () => {
      mockErrorFetch(500, 'Internal Server Error', {
        error: 'Servidor TTS indisponível',
      });

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test-voice', 'english');
      });

      expect(result.current.status).toBe(GenerationStatus.Error);
      expect(result.current.error).toBe('Servidor TTS indisponível');
    });

    it('deve tratar erro quando fetch rejeita (network error)', async () => {
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test-voice', 'english');
      });

      expect(result.current.status).toBe(GenerationStatus.Error);
      expect(result.current.error).toBe('Network request failed');
    });
  });

  describe('reset', () => {
    it('deve voltar ao estado Idle após reset', async () => {
      mockSuccessFetch();

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test', 'english');
      });
      expect(result.current.status).toBe(GenerationStatus.Ready);

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe(GenerationStatus.Idle);
    });

    it('deve limpar audioUrl após reset', async () => {
      mockSuccessFetch();

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test', 'english');
      });
      expect(result.current.audioUrl).toBe('https://mocked.url/audio.wav');

      act(() => {
        result.current.reset();
      });

      expect(result.current.audioUrl).toBeNull();
    });

    it('deve limpar error após reset', async () => {
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockRejectedValueOnce(new Error('Erro de rede'));

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test', 'english');
      });
      expect(result.current.status).toBe(GenerationStatus.Error);
      expect(result.current.error).toBe('Erro de rede');

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe(GenerationStatus.Idle);
      expect(result.current.error).toBeNull();
    });

    it('deve resetar duration para 0', async () => {
      mockSuccessFetch();

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test', 'english');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.duration).toBe(0);
    });

    it('deve chamar revokeObjectURL com o audioUrl atual ao resetar', async () => {
      mockSuccessFetch();

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test', 'english');
      });
      expect(result.current.audioUrl).toBe('https://mocked.url/audio.wav');

      act(() => {
        result.current.reset();
      });

      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        'https://mocked.url/audio.wav',
      );
    });

    it('deve voltar ao Idle sem erro se chamado quando já está Idle', () => {
      const { result } = renderUseTextToSpeech();

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe(GenerationStatus.Idle);
      expect(result.current.error).toBeNull();
      expect(result.current.audioUrl).toBeNull();
    });
  });

  describe('gerenciamento de object URLs', () => {
    it('deve registrar object URL ao gerar áudio', async () => {
      mockSuccessFetch();

      const { result } = renderUseTextToSpeech();

      await act(async () => {
        await result.current.generate('hello', 'test', 'english');
      });

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(result.current.audioUrl).toBe('https://mocked.url/audio.wav');
    });
  });
});
