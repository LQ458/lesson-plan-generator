# Multi-stage build optimized for RAG loading
FROM node:18-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY web/package.json ./web/package.json
COPY server/package.json ./server/package.json

# Install all dependencies with proper native support
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# Build frontend
FROM base AS web-builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY web ./web
COPY package.json pnpm-workspace.yaml ./
WORKDIR /app/web
RUN pnpm build

# Prepare server
FROM base AS server-builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY package.json pnpm-workspace.yaml ./

# Production runtime
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001
ENV WEB_PORT=3002

# Create non-root user  
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application
COPY --from=web-builder --chown=nextjs:nodejs /app/web/.next ./web/.next
COPY --from=web-builder --chown=nextjs:nodejs /app/web/public ./web/public
COPY --from=web-builder --chown=nextjs:nodejs /app/web/package.json ./web/package.json
COPY --from=web-builder --chown=nextjs:nodejs /app/web/next.config.js ./web/next.config.js

COPY --from=server-builder --chown=nextjs:nodejs /app/server ./server
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

COPY --chown=nextjs:nodejs package.json pnpm-workspace.yaml ./

# Create directories
RUN mkdir -p ./server/logs ./chroma_db ./server/rag/data
RUN chown -R nextjs:nodejs ./server/logs ./chroma_db ./server/rag/data

# Copy entrypoint
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose correct ports
EXPOSE 3001 3002

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["/app/docker-entrypoint.sh"]
