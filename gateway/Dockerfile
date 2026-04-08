# Stage 1: Base
# Lưu ý: Hiện tại Node.js bản stable nhất là 22.x hoặc 23.x.
# Nếu bạn muốn dùng bản mới nhất (Bleeding Edge), hãy đảm bảo Image này tồn tại trên Docker Hub.
FROM node:23-bookworm-slim AS base
WORKDIR /app
COPY package*.json ./

# Stage 2: Development
FROM base AS development
# Cài đặt toàn bộ bao gồm cả nodemon (nếu có trong devDependencies)
RUN npm install
COPY . .
ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}
# Gateway thường dùng lệnh dev để hot-reload khi bạn chỉnh sửa route
CMD ["npm", "run", "dev"]

# Stage 3: Production
FROM base AS production
RUN npm install --omit=dev
COPY . .
ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD ["npm", "start"]