# syntax=docker/dockerfile:1

# ─── Etapa 1: dependencias ──────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# "npm ci" exige que el lockfile coincida exacto con el arbol de dependencias
# opcionales de la plataforma actual; el lockfile se genero en Windows y no
# resuelve igual la rama opcional de @tailwindcss/oxide (fallback WASM) en
# Linux. "npm install" resuelve correctamente para la plataforma del propio
# contenedor sin depender de que el lockfile sea portable entre SO.
RUN npm install

# ─── Etapa 2: build ──────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# DATABASE_URL ficticia: "next build" no se conecta a la base real, pero
# algunas rutas evalúan el schema de Prisma en tiempo de build y fallan
# si la variable no existe.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"

RUN npx prisma generate
RUN npm run build

# ─── Etapa 3: producción ─────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Salida "standalone" de Next.js: servidor Node autocontenido
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# CLI de Prisma completo (necesario para "migrate deploy" al arrancar)
# + esquema y migraciones. Se copian aparte porque la salida standalone
# solo incluye el cliente en tiempo de ejecución, no el CLI.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000

# Aplica las migraciones pendientes (sin generar nuevas) y arranca el servidor.
# Se invoca directamente el archivo de entrada del CLI (build/index.js) en vez
# de "prisma" o "npx prisma": ninguno de los dos funciona sin el symlink de
# .bin, que no existe porque solo copiamos las carpetas de paquetes al runner.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
