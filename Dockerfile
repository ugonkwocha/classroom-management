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

# Copy init script
COPY scripts/init-db.js ./scripts/init-db.js

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start with npm - which will run the init script first
CMD ["npm", "start"]
