# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Stage 2: Development
FROM base AS development
# Cài đặt toàn bộ package kể cả devDependencies
RUN npm install
COPY . .
# Biến môi trường nhận giá trị port từ docker-compose
ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}
# Lệnh chạy server trong lúc code
CMD ["npm", "run", "dev"]

# Stage 3: Builder (cho production)
FROM base AS builder
# Chỉ cài đặt dependencies cần thiết
RUN npm install --omit=dev

# Stage 4: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port
ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["dumb-init", "node", "app.js"]