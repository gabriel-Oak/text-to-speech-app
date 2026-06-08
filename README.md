# Text to Speech App

Aplicação de Text-to-Speech utilizando [Pocket TTS](https://github.com/kyutai-labs/pocket-tts).

## Tecnologias

- [Next.js 15](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Pocket TTS](https://github.com/kyutai-labs/pocket-tts) - Servidor TTS local (Python)
- [Jest](https://jestjs.io/) - Testes unitários
- [ESLint](https://eslint.org/) - Linting
- [Prettier](https://prettier.io/) - Formatação
- [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) - Hooks de pré-commit
- [Commitlint](https://commitlint.js.org/) - Validação de mensagens de commit
- [GitHub Actions](https://github.com/features/actions) - CI/CD

## Pré-requisitos

- Node.js 20+
- Python 3.10+
- [Pocket TTS](https://github.com/kyutai-labs/pocket-tts) (`pip install pocket-tts`)

## Estrutura do Projeto

```
text-to-speech-app/
├── .github/workflows/       # GitHub Actions workflows
│   ├── ci.yml               # Pipeline CI (lint, test, build)
│   └── commit-lint.yml      # Validação de mensagens de commit
├── .husky/                  # Husky hooks (pre-commit)
├── public/                  # Arquivos estáticos
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/tts/         # API routes (proxy)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/          # Componentes React
│   │   └── TTSPlayer.tsx
│   ├── hooks/               # Custom hooks
│   │   └── useTextToSpeech.ts
│   ├── lib/                 # Bibliotecas e clients
│   │   └── ttsClient.ts
│   ├── __tests__/           # Testes unitários
│   │   ├── components/
│   │   └── lib/
│   └── styles/              # Estilos globais
│       └── globals.css
├── .env.example             # Variáveis de ambiente
├── .eslintrc.json
├── .prettierrc
├── commitlint.config.js
├── jest.config.ts
├── next.config.ts
└── tsconfig.json
```

## Instalação

```bash
# Instalar dependências do Node.js
npm install

# Instalar Pocket TTS (Python)
pip install pocket-tts

# Copiar variáveis de ambiente
cp .env.example .env.local
```

## Executando

```bash
# Desenvolvimento (apenas Next.js)
npm run dev

# Desenvolvimento (Next.js + Pocket TTS server)
npm run dev:all

# Build de produção
npm run build

# Iniciar produção
npm start
```

### Pocket TTS Server

O Pocket TTS pode ser executado separadamente:

```bash
# Servidor com voz padrão (rafael - português)
pocket-tts serve --host 0.0.0.0 --port 8000

# Servidor com voz específica
pocket-tts serve --voice anna --language english

# Servidor com voz personalizada (voice cloning)
pocket-tts serve --voice /caminho/para/voice.wav
```

[Voizes disponíveis](https://huggingface.co/kyutai/tts-voices):
- **alba** (en), **giovanni** (it), **lola** (es), **juergen** (de)
- **rafael** (pt), **estelle** (fr), **anna** (en), **azelma** (en)
- E muitas outras...

[Linguagens suportadas](https://kyutai-labs.github.io/pocket-tts/):
- `english`, `portuguese`, `french`, `german`, `italian`, `spanish`
- Variantes 24l para maior qualidade: `english_24l`, `portuguese_24l`, etc.

## Scripts

```bash
# Testes
npm run test              # Executar testes
npm run test:watch        # Modo watch
npm run test:coverage     # Com cobertura

# Linting
npm run lint              # Executar ESLint
npm run lint:fix          # Corrigir automaticamente

# Prepare hooks (auto executado no npm install)
npm run prepare
```

## Pré-commit Hooks

O projeto utiliza Husky + lint-staged + commitlint para garantir qualidade do código:

- **Antes do commit:** ESLint e Prettier rodam nos arquivos staged
- **Validação de commit:** Commitlint valida o formato da mensagem (Conventional Commits)

```bash
# Exemplo de commit válido
git commit -m "feat(tts): adds voice selection dropdown"

# Exemplo de commit inválido
git commit -m "fixed stuff"  # ❌
```

## GitHub Actions

O pipeline CI inclui:

1. **Commit Lint** — Valida mensagens de commit no push/PR
2. **Lint & Type Check** — ESLint + TypeScript
3. **Unit Tests** — Jest com cobertura mínima de 70%
4. **Build** — Compilação do projeto

## Formato de Commits

Siga o [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(tts): Adds voice selection feature
fix(api): Fixes audio generation timeout
docs(readme): Updates installation instructions
refactor(client): Simplifies TTS client interface
```

Tipos aceitos: `feat`, `fix`, `build`, `cry`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`, `revert`

## Dependabot

Atualizações automáticas de dependências via [dependabot.yml](./.github/dependabot.yml) — rodadas semanalmente.
