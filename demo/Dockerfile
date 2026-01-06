# Multi-stage Dockerfile for Demo Shell
# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy all packages and the demo
COPY packages/ ./packages/
COPY demo/ ./demo/

# Install dependencies for the workspace
RUN pnpm install --frozen-lockfile

# Build the demo
WORKDIR /app/demo
RUN pnpm build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/demo/dist /usr/share/nginx/html

# Copy nginx configuration
COPY demo/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
