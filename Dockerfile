# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client for the target platform
RUN npx prisma generate
RUN npm run build

# ── Stage 3: production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prisma CLI + client needed at runtime for db push & queries
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Standalone Next.js output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Entrypoint that migrates then starts the app
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./entrypoint.sh"]
