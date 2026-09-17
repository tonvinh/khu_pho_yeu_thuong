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
# basePath truyền lúc build (Q5): '' cho domain riêng, '/khu-pho-biet-thuong' cho
# fpt.vn/khu-pho-biet-thuong (chốt 8/9). Giá trị NƯỚNG vào image — đổi là phải build lại.
ARG BASE_PATH=""
ENV BASE_PATH=$BASE_PATH
ENV NEXT_TELEMETRY_DISABLED=1
# Build KHÔNG MẠNG (15/9): CI của FPT và production là môi trường kín. Chặn mạng ngay tại
# đây để máy dev build Docker cũng gặp đúng điều kiện đó — lần trước next/og tải emoji từ
# cdn.jsdelivr.net lúc prerender /opengraph-image, máy dev qua mà CI chết. Chỉ bước build
# bị chặn; `pnpm install` ở stage deps vẫn cần registry.
# Cần BuildKit (Docker ≥ 23 mặc định) hoặc buildah có hỗ trợ `RUN --network`. KHÔNG thêm
# dòng `# syntax=docker/dockerfile:1` — dòng đó kéo image frontend từ Docker Hub.
RUN --network=none pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# UID/GID CỐ ĐỊNH (17/9): ảnh upload nằm ở /app/uploads, production mount NFS vào đó.
# NFS phân quyền theo UID/GID SỐ và kubelet KHÔNG chown volume NFS (fsGroup không áp) ⇒
# thư mục export phải thuộc đúng UID/GID này, pod đặt runAsUser/runAsGroup khớp.
# `adduser -S` không có -u sẽ lấy UID động — đổi base image là lệch quyền, mất ghi ảnh.
ARG APP_UID=1001
ARG APP_GID=1001
RUN addgroup -S -g ${APP_GID} khupho \
  && adduser -S -u ${APP_UID} -G khupho khupho \
  && mkdir -p /app/uploads \
  && chown ${APP_UID}:${APP_GID} /app/uploads
# Ảnh upload: `${UPLOAD_DIR}/public/...`, `${UPLOAD_DIR}/private/...` (xem src/lib/storage.ts).
# Đây là thư mục DUY NHẤT app ghi lúc chạy — xem docs/18 §K8s về readOnlyRootFilesystem.
ENV UPLOAD_DIR=/app/uploads

COPY --from=builder --chown=khupho:khupho /app/.next/standalone ./
COPY --from=builder --chown=khupho:khupho /app/.next/static ./.next/static
COPY --from=builder --chown=khupho:khupho /app/public ./public
# Migration + seed chạy như lệnh riêng trong container (không tự chạy khi start).
# node_modules trong standalone đã chứa pg/@node-rs/argon2 (Next trace sẵn từ app code).
COPY --from=builder --chown=khupho:khupho /app/db ./db
COPY --from=builder --chown=khupho:khupho /app/scripts ./scripts

# USER dạng SỐ: Kubernetes `runAsNonRoot: true` chỉ kiểm được user số, tên user thì từ chối
# chạy pod ("image has non-numeric user").
USER ${APP_UID}:${APP_GID}
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/v1/counters || exit 1

CMD ["node", "server.js"]
