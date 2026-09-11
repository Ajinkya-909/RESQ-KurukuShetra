# ──────────────────────────────────────────────────────────────
# RESQ Frontend Dockerfile (Multi-Stage Production Build)
# Node.js 20 Builder → Nginx Alpine Web Server (Port 3000)
# ──────────────────────────────────────────────────────────────

# Stage 1: Build static assets with Vite & TailwindCSS
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy source code and assets
COPY . .

# Build-time environment variables for client-side API connectivity
ARG VITE_API_BASE_URL=http://localhost:3001/api
ARG VITE_WS_URL=http://localhost:3001
ARG VITE_GOOGLE_MAPS_API_KEY=AIzaSyDZojGFlhw4u_hUT1iZmIL9ggHy_uPHBHo

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Compile production bundle to /app/dist
RUN npm run build

# Stage 2: Serve optimized assets via high-performance Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built static files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for SPA routing & gzip compression
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Launch Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
