# budget-api — бэкенд Tracker: AI Budget App

REST API учебного пет-проекта для учёта личного бюджета: транзакции, категории,
JWT-авторизация и голосовой ввод трат (Nexara → транскрибация, OpenRouter →
парсинг в JSON). Стек: **NestJS + Prisma + PostgreSQL**.

## 📋 План разработки (роадмап)

Этапы всего проекта (бэкенд + фронтенд + релиз) ведутся **в одном месте** — в
корне монорепозитория, чтобы план не дублировался и не расходился:

➡️ **[`../README.md`](../README.md)** — единый план-роадмап и статус по этапам.

Актуальная карта файлов и эндпоинтов — в [`SPEC.md`](./SPEC.md).

## Запуск локально

```bash
docker compose up -d          # postgres:16
npm install
npx prisma migrate dev        # накатить миграции
npm run start:dev             # http://localhost:3000
```

Нужен `.env` рядом: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
`NEXARA_API_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`.

В проде запуск другой — образ собирается по `Dockerfile`, миграции накатывает
`docker-entrypoint.sh`, точка входа `dist/src/main.js` (не `dist/main.js`).
Подробности — в [`../tracker-deploy/README.md`](../tracker-deploy/README.md)
