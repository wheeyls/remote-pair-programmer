FROM node:20-alpine

# Install git and other necessary tools
RUN apk add --no-cache git openssh-client ca-certificates

# Create a non-root user to run the application
RUN addgroup -S appuser && adduser -S appuser -G appuser

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Set permissions
RUN chown -R appuser:appuser /app

# Set environment variables
ENV NODE_ENV=production
ENV HOME=/home/appuser

# Create .ssh directory for the user
RUN mkdir -p /home/appuser/.ssh && \
    chown -R appuser:appuser /home/appuser && \
    chmod 700 /home/appuser/.ssh

# Switch to non-root user
USER appuser

# Command to run the worker
CMD ["node", "worker.js"]
