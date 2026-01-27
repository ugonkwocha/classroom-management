# Multi-stage build for Academy Enrollment System
# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Copy prisma schema and generate prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# Stage 2: Production runtime
FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy node_modules and built application from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json .
COPY --from=builder /app/prisma ./prisma

# Install postgresql client for database operations
RUN apk add --no-cache postgresql-client

# Copy init scripts
COPY scripts/init-db.js ./init-db.js
COPY scripts/start.sh ./start.sh
RUN chmod +x ./init-db.js ./start.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start with database initialization then Next.js
CMD ["sh", "-c", "node ./init-db.js && npm start"]
