<<<<<<< HEAD
# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder: cài đầy đủ deps (bao gồm devDependencies nếu có build step)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

# Thêm các công cụ native cần thiết để build một số package (vd: bcrypt, canvas)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package manifest trước → Docker cache layer này nếu package.json không đổi
COPY package*.json ./

# npm ci: cài đúng version trong package-lock.json, nhanh & reproducible
RUN npm ci

# Copy toàn bộ source code vào builder
=======
# Stage 1: Base
FROM node:24.14.0-bookworm-slim AS base
WORKDIR /app
COPY package*.json ./

# Stage 2: Development
FROM base AS development
# Cài đặt toàn bộ package kể cả devDependencies
RUN npm install
>>>>>>> 4939e8ad93c530cb7c32b1fa221f909dbdc21d5d
COPY . .
# Biến môi trường nhận giá trị port từ docker-compose (lấy từ thư mục gốc)
ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}
# Lệnh chạy server trong lúc code
CMD ["npm", "run", "dev"]

<<<<<<< HEAD
# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — runner: image production tối giản, không có devDependencies / build tools
# ──────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS runner

# Metadata
LABEL maintainer="cab-booking-system" \
    service="notification-service" \
    version="1.0.0"

# Biến môi trường mặc định — có thể override qua docker-compose / K8s
ENV NODE_ENV=production \
    PORT=3004

WORKDIR /app

# Chỉ copy những gì cần để chạy (node_modules + source) từ builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src          ./src
COPY --from=builder /app/index.js     ./index.js
COPY --from=builder /app/package.json ./package.json

# Tạo user không có quyền root để tăng bảo mật
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose port HTTP + Socket.IO dùng chung
EXPOSE 3004

# Dùng node trực tiếp thay vì npm start → tránh thêm một process wrapper
CMD ["node", "index.js"]
=======
# Stage 3: Production
FROM base AS production
# Chỉ cài đặt package cần thiết cho production
RUN npm install --omit=dev
COPY . .
ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}
# Lệnh deploy
CMD ["npm", "start"]
>>>>>>> 4939e8ad93c530cb7c32b1fa221f909dbdc21d5d
