# ──────────────────────────────────────────────────────────────
# RESQ ML Service Dockerfile
# Python 3.11 + FastAPI + XGBoost + Google OR-Tools + YOLO
# ──────────────────────────────────────────────────────────────

FROM python:3.11-slim

# Install system dependencies for OpenCV and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifest and install Python packages
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy ML service source code
COPY . /app/ml

# Set environment variables for Python module resolution and unbuffered logs
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV ML_PORT=8001

EXPOSE 8001

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD curl -f http://localhost:8001/health || exit 1

# Start Uvicorn ASGI server
CMD ["uvicorn", "ml.service.main:app", "--host", "0.0.0.0", "--port", "8001"]
