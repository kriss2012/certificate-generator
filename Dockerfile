# Use official Node.js 22 Debian Bookworm slim image (required for better-sqlite3 v13+)
FROM node:22-bookworm-slim

# Install system dependencies: Python 3, pip, venv, and build tools for native addons (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PyMuPDF (fitz) required for official certificate PDF manipulation
RUN pip3 install --no-cache-dir --break-system-packages pymupdf

# Set working directory
WORKDIR /app

# Copy package manifests first for efficient Docker layer caching
COPY package*.json ./

# Install production dependencies and rebuild better-sqlite3 against container Node 22 ABI
RUN npm ci --omit=dev || npm install --omit=dev
RUN npm rebuild better-sqlite3

# Copy application source code
COPY . .

# Create persistent and runtime directories
RUN mkdir -p /app/data /app/uploads /app/public/stamped_certificates/generated

# Expose port (Railway dynamically overrides PORT at runtime)
EXPOSE 3000

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV PYTHON_PATH=python3

# Start the application
CMD ["npm", "start"]
