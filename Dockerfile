# 多阶段构建
FROM node:18-alpine AS base

# 安装依赖
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# 构建前端
FROM base AS web-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN cd web && pnpm build

# 构建后端
FROM base AS server-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN cd server && pnpm install --frozen-lockfile

# 生产镜像
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 复制构建产物
COPY --from=web-builder /app/web/.next ./web/.next
COPY --from=web-builder /app/web/public ./web/public
COPY --from=web-builder /app/web/package.json ./web/package.json
COPY --from=server-builder /app/server ./server

# 安装生产依赖
RUN npm install -g pnpm
RUN cd web && pnpm install --prod
RUN cd server && pnpm install --prod

# 暴露端口
EXPOSE 3000 5000

# 启动命令
CMD ["sh", "-c", "cd server && pnpm start & cd web && pnpm start"] 