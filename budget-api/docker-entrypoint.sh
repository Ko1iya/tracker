#!/bin/sh
# Точка входа прод-контейнера бэка.
# Перед стартом приложения накатываем миграции на прод-базу: prisma migrate
# deploy применяет все ещё не применённые миграции из prisma/migrations
# (в отличие от `migrate dev`, ничего не генерит и не трогает схему интерактивно —
# безопасно для прода). Если новых миграций нет — просто ничего не делает.
set -e

echo "==> Применяю миграции Prisma (migrate deploy)..."
npx prisma migrate deploy

echo "==> Запускаю NestJS (node dist/src/main)..."
# nest build кладёт точку входа в dist/src/main.js (sourceRoot=src + .ts-файлы
# в корне расширяют rootDir). exec — чтобы node стал PID 1 и корректно получал
# сигналы остановки от Docker.
exec node dist/src/main
