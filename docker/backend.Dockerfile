# Use multi-stage build for smaller production image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY backend/tsconfig.json ./
COPY backend/src/ ./src/
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Copy migration files
COPY --from=builder /app/src/migrations ./dist/migrations

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]