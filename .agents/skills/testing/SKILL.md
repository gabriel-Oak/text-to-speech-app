---
name: testing
description: Testing for the project. You MUST use this skill every time when writhing or editing tests.
---

# Testing - Instructions for AI Code Agent

**This skill contains mandatory rules and patterns for test development in the Anota AI project.**

**Only follow these instructions when developing and writing tests.**

---

## Allowed Tools

- **Framework:** Jest (`npm install -D jest`)
- **Testing Library:** React Testing Library (`npm install -D @testing-library/react`)

**No other testing libraries are allowed.**

---

## Global Scope and Configuration

- There is no need to import `"describe"`, `"expect"`, or `"it"` from anywhere.
- Jest configures these imports **globally and automatically**.
- Never add manual imports as shown below:

```javascript
// ❌ WRONG
import { describe, it, expect } from '@jest/globals';

// ✅ CORRECT (no imports needed)
describe('my test', () => {
  it('performs a check', () => {
    expect(true).toBe(true);
  });
});

---

## 🚀 Criar e Rodar Testes com pi-subagents (OBRIGATÓRIO)

**Sempre** que for criar, editar OU rodar testes unitários, use o agente `Agent` (pi-subagents nativo) com `subagent_type: "general-purpose"`. Isso mantém seu contexto limpo do "lixo" do vai-e-vem de criação de código e do Jest.

### Criar testes

❌ **NUNCA** crie testes diretamente (usando `write`/`edit` no contexto pai) — isso polui seu contexto com todo o vai-e-vem de escrita de código.

✅ **SEMPRE** delegue a criação de testes para um subagent via `Agent` tool:

```typescript
Agent({
  prompt: "Crie um arquivo de teste para src/components/Drawer.tsx seguindo as regras da skill testing. Use Jest + React Testing Library. Crie o arquivo em src/components/Drawer.test.tsx com testes para: renderização, abrir/fechar drawer, e integração com DrawerContext.",
  description: "Criar testes Drawer",
  subagent_type: "general-purpose",
})
```

### Rodar testes

✅ Use subagent para validar:

```typescript
Agent({
  prompt: "Roda os testes unitários do projeto (npm test -- --testPathPattern=Drawer.test) e me retorna apenas se passaram ou não, sem detalhes. Se houver falhas, corrija e rode novamente.",
  description: "Validar testes Drawer",
  subagent_type: "general-purpose",
})
```

### Por que usar pi-subagents?

- **Contexto isolado:** Todo o ciclo do subagent (criação de arquivos, tool calls, output cru, cobertura) fica contido lá dentro
- **Sem poluição:** O pai só recebe o resultado final, sem os 100+ eventos de streaming
- **Eficiência:** Seu contexto não é poluído com o vai-e-vem de criação/leitura/edição de código
- **Resultado limpo:** Você só precisa saber que o teste foi criado e passou
- **Nativo:** Usa a extensão `@tintinweb/pi-subagents` integrada ao pi-coding-agent, sem necessidade de spawn via bash

### Regra

❌ **NUNCA** crie, edite OU rode testes diretamente no contexto pai.

✅ **SEMPRE** use a `Agent` tool com `subagent_type: "general-purpose"` para delegar tarefas de teste — criação de arquivos, leitura de código base, escrita de testes, execução do Jest. Tudo fica contido no subagent.

### Quando usar

- Antes de cada commit de testes
- Após editar/adicionar tests
- Após editar código que pode quebrar testes existentes
- Como validação final antes de considerar uma feature "done"