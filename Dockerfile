# syntax=docker/dockerfile:1.7
#
# Bonfire backend container — primarily targeted at Hugging Face Spaces
# (Docker SDK), but it works anywhere with a plain Docker runtime.
#
# Build:   docker build -t bonfire-backend .
# Run:     docker run --rm -p 7860:7860 bonfire-backend

FROM python:3.13-slim AS base

# Hugging Face Spaces runs containers as UID 1000.
RUN useradd --create-home --uid 1000 user

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH="/home/user/.local/bin:${PATH}" \
    HF_HOME=/home/user/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/home/user/.cache/huggingface/sentence-transformers

USER user
WORKDIR /home/user/app

# Install Python deps (cached layer) before copying source.
COPY --chown=user:user backend/requirements.txt ./backend/requirements.txt
RUN pip install --user --no-cache-dir -r backend/requirements.txt

# Pre-download the MiniLM model so the first request after a cold start
# doesn't pay the ~80 MB download cost.
RUN python -c "from sentence_transformers import SentenceTransformer; \
SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Application source last for fastest incremental rebuilds.
COPY --chown=user:user backend ./backend

# Hugging Face Spaces injects $PORT (usually 7860). Default for local runs.
ENV PORT=7860
EXPOSE 7860

# `sh -c` so $PORT is expanded at container start.
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers"]
