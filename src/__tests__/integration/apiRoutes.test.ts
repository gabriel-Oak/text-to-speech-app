import { POST as generatePOST } from '@/app/api/tts/generate/route';
import { POST as exportPOST } from '@/app/api/tts/voice/export/route';
import { GET as _voicesListGET } from '@/app/api/voices/list/route';

// ============================================================================
// Mocks globais
// ============================================================================

// --- randomUUID determinístico ---
const uuidCalls: number[] = [];
jest.mock('crypto', () => ({
  ...jest.requireActual<typeof import('crypto')>('crypto'),
  randomUUID: () => {
    const idx = uuidCalls.length;
    uuidCalls.push(idx);
    return `test-uuid-${String(idx).padStart(3, '0')}`;
  },
}));

// --- AbortSignal.timeout (não existe no jsdom) ---
const mockAbortSignals: AbortController[] = [];

beforeAll(() => {
  if (!_AS.timeout) {
    _AS.timeout = (ms: number) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    };
  }
});

// ============================================================================
// Helpers
// ============================================================================

function createMockNextRequest(
  method: string,
  body?: unknown,
  options?: {
    formData?: FormData;
  },
): MockNextRequest {
  return {
    method,
    json: async (): Promise<unknown> => body ?? {},
    formData: async (): Promise<FormData> =>
      options?.formData ?? new FormData(),
    headers: new Map([['content-type', 'application/json']]),
  };
}

function __createMockNextResponse(status: number, data: unknown) {
  return {
    status,
    json: data,
    body: data,
    headers: new Map([
      ['content-type', 'application/json'],
      ['x-status', String(status)],
    ]),
    ok: status >= 200 && status < 300,
  };
}

function __isNextResponse(obj: unknown): obj is Response {
  if (obj === null || typeof obj !== 'object') return false;
  return (
    obj instanceof Response ||
    (obj.headers && typeof obj.headers.get === 'function')
  );
}

// ============================================================================
// Setup por grupo de testes
// ============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  uuidCalls.length = 0;
  mockAbortSignals.length = 0;

  _AS.timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    mockAbortSignals.push(controller);
    return controller.signal;
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ============================================================================
// GET /api/voices/list
// ============================================================================

describe('GET /api/voices/list', () => {
  beforeEach(() => {
    // Mock fs para a rota de vozes
    jest.mock('fs', () => ({
      readdirSync: jest.fn().mockReturnValue(['cloned-voice.safetensors']),
      existsSync: jest.fn().mockReturnValue(true),
    }));
    // Re-import after mock
    jest.resetModules();
  });

  it('deve retornar todas as vozes built-in + clonadas', async () => {
    // Re-import para usar o fs mock
    const { GET } = await import('@/app/api/voices/list/route');
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(json.voices)).toBe(true);
    expect(json.voices.length).toBeGreaterThan(10); // built-in + 1 clonada
  });

  it('deve incluir vozes built-in com type builtin', async () => {
    const { GET } = await import('@/app/api/voices/list/route');
    const response = await GET();
    const json = await response.json();

    const builtInVoices = json.voices.filter(
      (v): v is Voice & { type: 'builtin' } => v.type === 'builtin',
    );
    expect(builtInVoices.length).toBeGreaterThan(0);
    builtInVoices.forEach((v) => {
      expect(v.type).toBe('builtin');
      expect(v.id).toBeTruthy();
      expect(v.name).toBeTruthy();
      expect(v.language).toBeTruthy();
    });
  });

  it('deve incluir vozes clonadas quando existam arquivos .safetensors', async () => {
    const { GET } = await import('@/app/api/voices/list/route');
    const response = await GET();
    const json = await response.json();

    const clonedVoices = json.voices.filter(
      (v): v is Voice & { type: 'cloned' } => v.type === 'cloned',
    );
    expect(clonedVoices.length).toBe(1);
    expect(clonedVoices[0].name).toBe('cloned-voice');
    expect(clonedVoices[0].safetensorsPath).toBe(
      '.tts-voices/cloned-voice.safetensors',
    );
  });

  it('deve retornar apenas built-in quando não houver vozes clonadas', async () => {
    // Sobrescrever readdirSync para retornar array vazio
    const fs = jest.requireActual('fs');
    fs.readdirSync.mockReturnValue([]);

    const { GET } = await import('@/app/api/voices/list/route');
    const response = await GET();
    const json = await response.json();

    const clonedVoices = json.voices.filter(
      (v): v is Voice & { type: 'cloned' } => v.type === 'cloned',
    );
    expect(clonedVoices.length).toBe(0);
    expect(json.voices.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// POST /api/tts/generate
// ============================================================================

describe('POST /api/tts/generate', () => {
  beforeEach(() => {
    // Mock fs para a rota de generate (mkdirSync + existsSync)
    jest.mock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      mkdirSync: jest.fn(),
    }));
  });

  it('deve retornar audio blob quando sucesso', async () => {
    // Mock fetch para o servidor TTS
    const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    } as Response);

    const request = createMockNextRequest('POST', {
      text: 'Olá mundo',
      voice: 'anna',
      language: 'english',
    });

    const response = await generatePOST(request as unknown as Response);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/generate'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Olá mundo',
          voice: 'anna',
          language: 'english',
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('audio');
  });

  it('deve retornar 400 quando texto estiver vazio', async () => {
    const request = createMockNextRequest('POST', {
      text: '',
      voice: 'anna',
      language: 'english',
    });

    const response = await generatePOST(request as unknown as Response);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('obrigatório');
  });

  it('deve retornar 500 quando servidor TTS indisponível', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('Server error'),
    } as Response);

    const request = createMockNextRequest('POST', {
      text: 'Olá mundo',
      voice: 'anna',
      language: 'english',
    });

    const response = await generatePOST(request as unknown as Response);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toContain('Servidor TTS');
  });

  it('deve retornar 400 quando voz não informada', async () => {
    const request = createMockNextRequest('POST', {
      text: 'Olá mundo',
      voice: '',
      language: 'english',
    });

    const response = await generatePOST(request as unknown as Response);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('obrigatório');
  });
});

// ============================================================================
// POST /api/tts/voice/export
// ============================================================================

describe('POST /api/tts/voice/export', () => {
  beforeEach(() => {
    // Mock fs para a rota de export
    jest.mock('fs', () => ({
      existsSync: jest.fn((path: string) => {
        // pocket-tts binário existe
        if (path === 'pocket-tts') return true;
        // .tts-voices directory existe
        if (path.includes('.tts-voices')) return true;
        // safetensors file existe (para sucesso)
        return false;
      }),
      mkdirSync: jest.fn(),
      writeFileSync: jest.fn(),
      unlinkSync: jest.fn(),
    }));

    // Mock child_process — pocket-tts CLI está disponível e export com sucesso
    jest.mock('child_process', () => ({
      execSync: jest.fn(),
      execFileSync: jest.fn().mockReturnValue(''),
    }));

    // Mock randomUUID para paths determinísticos
    uuidCalls.length = 0;
  });

  it('deve exportar voz com sucesso', async () => {
    // Configurar existsSync para o safetensors file
    const fs = jest.requireActual('fs');
    const _originalExistsSync = fs.existsSync;
    let _safetensorsPathToCheck: string | null = null;

    fs.existsSync.mockImplementation((path: string) => {
      if (path === 'pocket-tts') return true;
      if (path.includes('.tts-voices')) return true;
      // Verificar se é o path do safetensors
      if (path.includes('.safetensors')) {
        _safetensorsPathToCheck = path;
        return true;
      }
      return false;
    });

    const formData = new FormData();
    formData.append('file', new Blob(['test audio']), 'test.wav');
    formData.append('name', 'Minha Voz');
    formData.append('language', 'portuguese');

    const request = createMockNextRequest('POST', undefined, { formData });

    const response = await exportPOST(request as unknown as Response);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.voiceId).toBeTruthy();
    expect(json.name).toBe('Minha_Voz');
    expect(json.safetensorsPath).toBe('.tts-voices/Minha_Voz.safetensors');
    expect(jest.requireActual('child_process').execSync).toHaveBeenCalledWith(
      expect.stringContaining('pocket-tts export-voice'),
      expect.any(Object),
    );
  });

  it('deve retornar 400 para formato de arquivo inválido', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'test.flac');
    formData.append('name', 'Minha Voz');
    formData.append('language', 'portuguese');

    const request = createMockNextRequest('POST', undefined, { formData });

    const response = await exportPOST(request as unknown as Response);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('Formato não suportado');
  });

  it('deve retornar 400 para arquivo excedendo tamanho máximo', async () => {
    // Criar um blob de ~31MB
    const largeBlob = new Blob([new ArrayBuffer(31 * 1024 * 1024)]);
    const formData = new FormData();
    formData.append('file', largeBlob, 'test.wav');
    formData.append('name', 'Minha Voz');
    formData.append('language', 'portuguese');

    const request = createMockNextRequest('POST', undefined, { formData });

    const response = await exportPOST(request as unknown as Response);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('muito grande');
  });

  it('deve retornar 500 quando export falha', async () => {
    // Configurar existsSync para que o safetensors NÃO seja gerado
    const fs = jest.requireActual('fs');
    fs.existsSync.mockImplementation((path: string) => {
      if (path === 'pocket-tts') return true;
      if (path.includes('.tts-voices')) return true;
      return false;
    });

    // Fazer execSync lançar erro
    const cp = jest.requireActual('child_process');
    cp.execSync.mockImplementation(() => {
      throw new Error('Falha na exportação');
    });

    const formData = new FormData();
    formData.append('file', new Blob(['test audio']), 'test.wav');
    formData.append('name', 'Minha Voz');
    formData.append('language', 'portuguese');

    const request = createMockNextRequest('POST', undefined, { formData });

    const response = await exportPOST(request as unknown as Response);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toContain('Falha na exportação');
  });
});
