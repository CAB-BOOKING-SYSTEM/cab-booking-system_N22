# Dockerfile (sửa lại)
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# ❌ Cách cũ (bị lỗi)
# RUN npm ci --only=production

# ✅ Cách mới (dùng npm install)
RUN npm install --omit=dev

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

CMD ["node", "index.js"]