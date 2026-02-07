# =============================================================================
# 4XL Frontend - Multi-stage Docker Build
# Optimized for HuggingFace Spaces (Static/Docker SDK)
# =============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# API calls go to /api (nginx proxies to backend's /gradio_api)
ENV VITE_API_URL=/api

# Build the application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine AS production

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Ensure writable dirs for non-root nginx on HF Spaces
RUN mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chmod -R 777 /tmp

# HuggingFace Spaces expects port 7860
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:7860/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
