# Dockerfile for TikTok Live Text-to-Speech (TTS) Cloud Web Platform
# Hugging Face Spaces Docker Container Specification

FROM python:3.11-slim

WORKDIR /app

# Install system audio libraries, compilers, and media encoders
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code, templates, and static assets
COPY . .

# Create audio cache directory
RUN mkdir -p .cache/audio

# Default HTTP port (7860 for Hugging Face Spaces, dynamically overridden by $PORT on Render / Cloud)
ENV PORT=7860
EXPOSE 7860

# Launch Uvicorn ASGI server binding to all network interfaces with dynamic port support
CMD ["sh", "-c", "uvicorn src.web_server:app --host 0.0.0.0 --port ${PORT:-7860}"]
