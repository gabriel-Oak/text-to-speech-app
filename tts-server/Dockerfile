# ---------------------------------------------------------------------------
# Pocket TTS Server — Dockerfile
#
# Baseia-se no package pip pocket-tps (2.1.0)
# Instala todas as dependências (torch, fastapi, uvicorn, etc.)
# ---------------------------------------------------------------------------

FROM python:3.12-slim

WORKDIR /app

# Instala dependências do sistema (sentencepiece, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Instala o pocket-tts (inclui torch, fastapi, uvicorn, etc.)
RUN pip install --no-cache-dir pocket-tts==2.1.0

# Expõe a porta da API
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Comando padrão: serve no host 0.0.0.0
CMD ["pocket-tts", "serve", "--host", "0.0.0.0", "--port", "8000", "--language", "portuguese"]
