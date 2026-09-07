# Сборка бэка (budget-api, NestJS) в прод-образ.
# Multi-stage: build-слой компилирует TypeScript и генерит Prisma Client,
# prod-слой запускает уже собранный dist через entrypoint (миграции + старт).

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Prisma Client генерится из schema.prisma в node_modules/.prisma.
# Без этого шага рантайм не найдёт сгенерированный клиент.
# prisma.config.ts требует, чтобы DATABASE_URL существовал (через env()), хотя
# generate к базе не подключается — подсовываем фиктивный URL только на этот шаг.
# Настоящий DATABASE_URL приходит в рантайме из .env.prod.
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate

# nest build → dist/main.js
RUN npm run build

# ---- prod stage ----
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

# Тянем из build-слоя ровно то, что нужно в рантайме:
# node_modules (с уже сгенерированным Prisma Client и CLI для миграций),
# собранный dist, схему/миграции Prisma и манифест.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
