# Multi-stage build for 9jacodekids Academy Enrollment System
# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies needed for the Next.js build, even if Coolify
# exposes NODE_ENV=production during Docker build.
RUN npm ci --include=dev && npm cache clean --force

# Copy source code
COPY . .

# Ensure optional asset directory exists for the runtime copy step
RUN mkdir -p public

# Copy prisma schema and generate prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# Keep the runtime image smaller after build tooling has done its work
RUN npm prune --omit=dev && npm cache clean --force

# Stage 2: Production runtime
FROM node:22-alpine

WORKDIR /app

# Install runtime utilities, including su-exec so the entrypoint can prepare
# mounted storage and then drop privileges before starting the application.
RUN apk add --no-cache curl postgresql-client su-exec

# Copy node_modules and built application from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json .
COPY --from=builder /app/prisma ./prisma

# Copy init script
COPY scripts/init-db.js ./scripts/init-db.js
COPY scripts/seed-admin.js ./scripts/seed-admin.js
COPY scripts/backfill-families.js ./scripts/backfill-families.js
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

RUN chmod +x ./scripts/docker-entrypoint.sh && chown -R node:node /app

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Prepare mounted storage as root, then start npm as the unprivileged node user.
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["npm", "start"]
