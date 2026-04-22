# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Stage 2: Development
FROM base AS development
RUN npm install
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
CMD ["node", "app.js"]