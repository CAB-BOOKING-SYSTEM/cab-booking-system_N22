# Stage 1: Base
FROM node:24.14.0-bookworm-slim AS base
WORKDIR /app
COPY package*.json ./

# Stage 2: Development
FROM base AS development
# Cài đặt toàn bộ package kể cả devDependencies
RUN npm install
COPY . .
# Biến môi trường nhận giá trị port từ docker-compose (lấy từ thư mục gốc)
ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}
# Lệnh chạy server trong lúc code
CMD ["npm", "run", "dev"]

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