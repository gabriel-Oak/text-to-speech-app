#!/usr/bin/env bash
# Roda os testes E2E sem warnings de depreciação de dependências.
exec node --no-deprecation "$(dirname "$0")/../node_modules/.bin/playwright" test "$@"
