# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — Base: Cài đặt nền tảng và công cụ build
# ──────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS base
WORKDIR /app
# Thêm các công cụ native cần thiết để build một số package (vd: bcrypt, canvas)
RUN apk add --no-cache python3 make g++
COPY package*.json ./

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — Development: Dành cho lúc dev local (nhận code từ nhánh main)
# ──────────────────────────────────────────────────────────────────────────────
FROM base AS development
RUN npm install
COPY . .
# Biến môi trường nhận giá trị port từ docker-compose
ARG PORT=3004
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD ["npm", "run", "dev"]

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3 — Builder: Chuẩn bị build cho Production (nhận code từ nhánh của Hiền)
# ──────────────────────────────────────────────────────────────────────────────
FROM base AS builder
# npm ci giúp cài đúng version trong package-lock.json
RUN npm ci
COPY . .
# Loại bỏ devDependencies để giảm tối đa dung lượng cho image cuối cùng
RUN npm prune --production

# ──────────────────────────────────────────────────────────────────────────────
# Stage 4 — Production (Runner): Tối giản, bảo mật cao (nhận code từ nhánh của Hiền)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS production

LABEL maintainer="cab-booking-system" \
    service="notification-service" \
    version="1.0.0"

ENV NODE_ENV=production \
    PORT=3004

WORKDIR /app

# Chỉ copy những gì cần để chạy (node_modules đã prune + source) từ builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src          ./src
COPY --from=builder /app/index.js     ./index.js
COPY --from=builder /app/package.json ./package.json

# Tạo user không có quyền root để tăng bảo mật
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose port HTTP + Socket.IO dùng chung
EXPOSE 3004

# Dùng node trực tiếp thay vì npm start → tránh process wrapper dư thừa
CMD ["node", "index.js"]