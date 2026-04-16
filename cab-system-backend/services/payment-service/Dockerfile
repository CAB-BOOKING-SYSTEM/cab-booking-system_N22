# Stage 1: Base
FROM node:18-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm install

# Stage 2: Development
FROM base AS development
COPY . .
ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD ["npm", "run", "dev"]

# Stage 3: Production
FROM base AS production
RUN npm install --omit=dev
COPY . .
ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD ["npm", "start"]