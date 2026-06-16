# 源信达地产目标成本测算系统
# 可用于阿里云 ECS / 普通 Linux 服务器 Docker Compose 部署

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install

FROM deps AS builder
WORKDIR /app
COPY prisma ./prisma
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates dumb-init \
  && rm -rf /var/lib/apt/lists/*
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/storage/uploads
EXPOSE 3000
ENTRYPOINT ["dumb-init", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
