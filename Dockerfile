# Сборка фронта (budget-web) в статику и раздача через nginx.
# Multi-stage: первый слой собирает Vite-бандл, второй — лёгкий nginx со статикой.

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Сначала только манифесты — слой с npm ci кешируется, пока не менялись зависимости.
COPY package*.json ./
RUN npm ci

COPY . .

# Vite инлайнит переменные VITE_* в бандл на этапе сборки (не в рантайме).
# В проде фронт и API за одним origin (edge-nginx проксирует /api на бэк),
# поэтому относительный /api — рабочий дефолт.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- serve stage ----
FROM nginx:alpine AS serve
# Свой конфиг с SPA-fallback (см. nginx.conf рядом).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
