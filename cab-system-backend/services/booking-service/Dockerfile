<<<<<<< Updated upstream
FROM node:20

WORKDIR /app

=======
# dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
>>>>>>> Stashed changes
COPY package*.json ./
RUN npm ci --only=production

<<<<<<< Updated upstream
RUN npm install

COPY . .

CMD ["npm", "start"]
=======
# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

CMD ["node", "index.js"]
>>>>>>> Stashed changes
