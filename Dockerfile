FROM node:20-alpine

# Install git
RUN apk add --no-cache git

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Command to run the worker
CMD ["node", "worker.js"]
