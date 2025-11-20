# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/ace ./ace

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S adonisjs -u 1001 && \
    chown -R adonisjs:nodejs /app

USER adonisjs

# Expose port
EXPOSE 3333

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3333/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "build/bin/server.js"]
