# Multi-stage Dockerfile for TeachAI RAG System
# Optimized for resource-constrained deployments (4-core CPU, 8GB RAM)

# Stage 1: Build dependencies and prepare environment
FROM node:18-alpine AS base
LABEL maintainer="TeachAI Team"
LABEL description="AI-powered lesson plan generator with simplified RAG"

# Install system dependencies for simplified RAG with timeout and retry
RUN apk update && apk add --no-cache --timeout=300 \
    sqlite \
    sqlite-dev \
    python3 \
    py3-pip \
    make \
    g++ \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Install pnpm
RUN npm install -g pnpm@8

# Set working directory
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY web/package.json ./web/package.json
COPY server/package.json ./server/package.json

# Install dependencies with optimizations for simplified RAG
RUN (pnpm install --frozen-lockfile --prod || pnpm install --force --prod) \
    && pnpm store prune

# Stage 3: Build frontend
FROM base AS web-builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY web ./web
COPY package.json pnpm-workspace.yaml ./

WORKDIR /app/web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build \
    && rm -rf node_modules/.cache \
    && rm -rf .next/cache

# Stage 4: Prepare server with simplified RAG
FROM base AS server-builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY package.json pnpm-workspace.yaml ./

# Copy simplified RAG system
COPY server/simple-rag/ ./server/simple-rag/

# Stage 5: Production runtime
FROM node:18-alpine AS runner
LABEL version="2.0-simplified-rag"

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S teachai \
    && adduser -S teachai -u 1001

WORKDIR /app

# Copy built applications
COPY --from=web-builder --chown=teachai:teachai /app/web/.next ./web/.next
COPY --from=web-builder --chown=teachai:teachai /app/web/public ./web/public
COPY --from=web-builder --chown=teachai:teachai /app/web/package.json ./web/package.json
COPY --from=web-builder /app/web/next.config.js ./web/next.config.js

COPY --from=server-builder --chown=teachai:teachai /app/server ./server
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

COPY --chown=teachai:teachai package.json pnpm-workspace.yaml ./

# Copy Docker support files
COPY --chown=teachai:teachai docker/ ./docker/
RUN chmod +x ./docker/*.sh

# Create necessary directories for simplified RAG
RUN mkdir -p \
    ./data \
    ./logs \
    ./models \
    ./backups \
    ./server/simple-rag/data \
    && chown -R teachai:teachai ./data ./logs ./models ./backups ./server

# Set environment variables for resource-constrained deployment
ENV NODE_ENV=production
ENV PORT=3001
ENV WEB_PORT=3000
ENV RAG_DB_TYPE=sqlite-vss
ENV RAG_SQLITE_PATH=/app/data/vectors.db
ENV RAG_DATA_DIR=/app/server/rag_data/chunks
ENV RAG_BACKUP_DIR=/app/backups
ENV EMBEDDING_PROFILE=balanced

# Resource optimization
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV UV_THREADPOOL_SIZE=4

# Expose ports
EXPOSE 3000 3001

# Switch to non-root user
USER teachai

# Health check for both services
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD ./docker/healthcheck.sh

# Start with simplified entrypoint
ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["start"]
