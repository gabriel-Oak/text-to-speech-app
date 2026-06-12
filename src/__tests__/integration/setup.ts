// ============================================================================
// Global setup for API routes integration tests
// ============================================================================

// ---------------------------------------------------------------------------
// Mock randomUUID — deterministic IDs across route modules
// ---------------------------------------------------------------------------

const uuidCalls: number[] = [];

jest.mock('crypto', () => ({
  ...jest.requireActual<typeof import('crypto')>('crypto'),
  randomUUID: () => {
    const idx = uuidCalls.length;
    uuidCalls.push(idx);
    return `test-uuid-${String(idx).padStart(3, '0')}`;
  },
}));

// ---------------------------------------------------------------------------
// AbortSignal.timeout polyfill type — not in standard lib
// ---------------------------------------------------------------------------

interface AbortSignalWithTimeout extends AbortSignal {
  timeout?: (ms: number) => AbortSignal;
}

const _AS = AbortSignal as AbortSignalWithTimeout;

// ---------------------------------------------------------------------------
// Mock next/server — provide NextRequest/NextResponse for route handlers
// ---------------------------------------------------------------------------

class MockNextResponse {
  constructor(
    public body: unknown,
    public options: { status?: number; headers?: Record<string, string> },
  ) {}

  static json(data: unknown, options: { status?: number } = {}) {
    return new MockNextResponse(data, {
      ...options,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  get status() {
    return this.options.status || 200;
  }

  get headers() {
    return {
      get: (key: string) => this.options.headers?.[key] ?? null,
      set: (key: string, value: string) => {
        this.options.headers = this.options.headers || {};
        this.options.headers[key] = value;
      },
    };
  }

  get ok() {
    return this.status >= 200 && this.status < 300;
  }

  async json() {
    return this.body;
  }
}

class MockNextRequest {
  constructor(
    public method: string,
    private _body: unknown,
    private _formData?: FormData,
  ) {}

  async json() {
    return this._body;
  }

  async formData() {
    return this._formData || new FormData();
  }
}

jest.mock('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

// ---------------------------------------------------------------------------
// Mock fs — used by voices/list and tts/voice/export routes
// ---------------------------------------------------------------------------

jest.mock('fs', () => ({
  readdirSync: jest.fn().mockReturnValue([] as string[]),
  existsSync: jest.fn().mockReturnValue(false as boolean),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock child_process — used by tts/voice/export route
// ---------------------------------------------------------------------------

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  execFileSync: jest.fn().mockReturnValue(''),
}));

// ---------------------------------------------------------------------------
// Mock AbortSignal.timeout — prevent test timeouts in jsdom
// ---------------------------------------------------------------------------

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
