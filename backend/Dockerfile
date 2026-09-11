# ──────────────────────────────────────────────────────────────
# RESQ Backend Gateway Dockerfile
# Node.js 20 Alpine + Express + Prisma ORM + Socket.IO
# ──────────────────────────────────────────────────────────────

FROM node:20-alpine

# Install openssl for Prisma engines and curl for healthcheck
RUN apk add --no-cache openssl curl

WORKDIR /app

# Copy package manifests and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm ci
RUN npx prisma generate

# Copy backend source code
COPY . .

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start Node.js API Gateway server
CMD ["node", "src/index.js"]
