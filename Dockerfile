FROM node:20-alpine AS base

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Aceitar build args do Easypanel (vars públicas usadas no build do Next.js)
ARG NEXT_PUBLIC_APP_NAME
ARG NODE_ENV=production
ARG GIT_SHA
# Vars de runtime — não usadas no build, mas declaradas para não quebrar
ARG SUPABASE_URL
ARG GITHUB_APP_ID
ARG GITHUB_INSTALLATION_ID

ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NODE_ENV=$NODE_ENV

RUN npm run build

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
