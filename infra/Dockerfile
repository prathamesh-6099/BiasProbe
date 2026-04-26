# ── BiasProbe Backend — Cloud Run Production Image ──────────────────────────
# Python 3.11-slim keeps the image small and avoids compiling heavy C extensions.
FROM python:3.11-slim

# ── System deps (only what's strictly needed) ────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        gcc \
        libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user (Cloud Run security best-practice) ─────────────────────────
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

# ── Install Python dependencies ───────────────────────────────────────────────
# Copy requirements first so Docker cache is reused when only source changes.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ── Copy application source ───────────────────────────────────────────────────
COPY . .

# ── Drop privileges ───────────────────────────────────────────────────────────
RUN chown -R appuser:appgroup /app
USER appuser

# ── Cloud Run injects $PORT at runtime (default 8080) ────────────────────────
ENV PORT=8080
EXPOSE ${PORT}

# uvicorn reads $PORT so the same image works in any environment.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1 --log-level info"]
