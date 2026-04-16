# Multi-stage build cho Node.js ứng dụng

# Stage 1: Base
FROM node:20-alpine AS base

# Cài đặt các dependencies cần thiết cho hệ thống
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Stage 2: Development
FROM base AS development

# Cài đặt dependencies cho development
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE ${PORT}

# Chạy với nodemon cho development
CMD ["npm", "run", "dev"]

# Stage 3: Production build
FROM base AS builder

# Cài đặt dependencies production
RUN npm install --omit=dev

# Stage 4: Production
FROM node:20-alpine AS production

# Cài đặt curl cho healthcheck
RUN apk add --no-cache curl

# Tạo user không root để chạy ứng dụng
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies từ builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy source code
COPY --chown=nodejs:nodejs . .

# Tạo thư mục logs nếu cần
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch sang user không root
USER nodejs

# Expose port
EXPOSE ${PORT}

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1

# Chạy ứng dụng
CMD ["node", "src/index.js"]