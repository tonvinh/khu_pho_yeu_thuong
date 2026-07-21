# Next.js multi-stage (07 §2.2): builder → runner node:22-alpine, standalone, non-root
# Node 22 + pnpm 9 cố định: corepack mặc định kéo pnpm 11 (đòi Node >=22.13 và hard-fail
# "ignored builds" của sharp/esbuild). pnpm 9 build native deps tự động, khớp lockfile 9.0.
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# basePath truyền lúc build (Q5): '' cho khupho.fpt.vn, '/khu-pho-de-thuong' cho fpt.vn/...
ARG BASE_PATH=""
ENV BASE_PATH=$BASE_PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S khupho && adduser -S khupho -G khupho

COPY --from=builder --chown=khupho:khupho /app/.next/standalone ./
COPY --from=builder --chown=khupho:khupho /app/.next/static ./.next/static
COPY --from=builder --chown=khupho:khupho /app/public ./public
# Migration + seed chạy như lệnh riêng trong container (không tự chạy khi start).
# node_modules trong standalone đã chứa pg/@node-rs/argon2 (Next trace sẵn từ app code).
COPY --from=builder --chown=khupho:khupho /app/db ./db
COPY --from=builder --chown=khupho:khupho /app/scripts ./scripts

USER khupho
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/v1/counters || exit 1

CMD ["node", "server.js"]
