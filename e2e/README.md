# E2E Tests — Pocket TTS

Execução dos testes E2E com Playwright.

## Pré-requisitos

- **Pocket TTS** instalado (`pip install pocket-tts`)
- **GPU** disponível (Pocket TTS requer CUDA)

## Execução

```bash
# Executar todos os testes E2E (headless)
npm run e2e

# Executar com interface visível (útil para debug)
npm run e2e:headed

# Executar em modo debug (abre navegador interativo)
npx playwright test --debug

# Executar apenas um arquivo
npx playwright test e2e/tts-generation.spec.ts

# Executar com Pocket TTS manualmente
make serve-tts &
npx playwright test
```

## Testes

| Arquivo | Descrição |
|---|---|
| `tts-generation.spec.ts` | Fluxo completo: carregar home, preencher texto, gerar áudio |

## Notas

- Os testes verificam se o Pocket TTS está rodando antes de tentar gerar áudio
- Se o Pocket TTS não estiver disponível, os testes de geração são pulados
- O Next.js dev server é iniciado automaticamente pelo Playwright (webServer)
- O Pocket TTS precisa ser iniciado manualmente antes dos testes (ou via script helper)

## Estrutura

```
e2e/
├── README.md              # Este arquivo
├── tts-generation.spec.ts # Testes E2E do fluxo TTS
```
