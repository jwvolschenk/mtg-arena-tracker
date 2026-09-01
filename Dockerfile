# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma generate runs via the build script and as postinstall
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    UPLOAD_DIR=/app/uploads \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apk add --no-cache openssl libc6-compat

# Production dependency tree (incl. the prisma CLI) so the entrypoint can
# run `prisma migrate deploy` before the server starts
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Next.js standalone server + static assets (overlays the prod node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma schema + migrations + the generated client (with query engine)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p /app/uploads

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
