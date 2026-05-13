# SPEC

Живая спецификация структуры проекта `budget-api`. Поддерживается автоматически: каждое изменение кода в `src/`, `prisma/schema.prisma` или `docker-compose.yml` сопровождается обновлением этого файла.

Правила ведения — в `CLAUDE.md`.

---

## Project Structure

```
budget-api/
├── docker-compose.yml          # PostgreSQL 16 в Docker для локальной разработки
├── prisma/
│   └──  schema.prisma           # Prisma schema: модели User, Category, Transaction
└── src/
    ├── main.ts                 # Точка входа: bootstrap NestJS приложения
    ├── app.module.ts           # Корневой module: регистрирует AppController, AppService, PrismaService, TransactionsModule
    ├── app.controller.ts       # Базовый controller — GET / возвращает приветствие
    ├── app.service.ts          # Возвращает строку 'Hello World!!' (placeholder)
    ├── prisma.service.ts       # Wrapper над PrismaClient: connect/disconnect на lifecycle hooks
    └── transactions/
        ├── transactions.module.ts                  # NestJS module для домена транзакций
        ├── transactions.controller.ts              # REST endpoints (POST/GET/PATCH/DELETE /transactions)
        ├── transactions.service.ts                 # Бизнес-логика CRUD транзакций через PrismaService
        ├── dto/
        │   ├── create-transaction.dto.ts           # DTO для POST: amount, description, type, userId
        │   └── update-transaction.dto.ts           # DTO для PATCH: PartialType от CreateTransactionDto
        └── entities/
            └── transaction.entity.ts               # Пустой класс-заглушка (сгенерирован nest g resource, пока не используется)
```

### Описание файлов

#### Корень

- **`docker-compose.yml`** — поднимает контейнер `postgres:16` для локальной БД. База `budget_db`, юзер `myuser`, порт `5432`, данные в volume `postgres_data`.

#### `prisma/`

- **`schema.prisma`** — Prisma schema. Datasource — PostgreSQL через `DATABASE_URL`. Описывает три модели (см. ниже).

**Prisma models:**

- **`User`** — пользователь системы. Поля: `id`, `email` (unique), `password`, `createdAt`. Имеет много `Category` и `Transaction`.
- **`Category`** — категория трат. Поля: `id`, `title`, `userId`. Принадлежит одному `User`, имеет много `Transaction`.
- **`Transaction`** — транзакция (доход или расход). Поля: `id`, `amount` (Decimal 10,2), `currency` (default "RUB"), `date`, `description?`, `type` ("INCOME" \| "EXPENSE"), `categoryId?`, `userId`. Привязана к `User` (обязательно) и опционально к `Category`.

#### `src/`

- **`main.ts`** — точка входа. Создаёт NestJS application через `NestFactory.create(AppModule)` и слушает `process.env.PORT ?? 3000`.
- **`app.module.ts`** — корневой `@Module`. Импортирует `TransactionsModule`, регистрирует `AppController`, провайдит `AppService` и `PrismaService`.
- **`app.controller.ts`** — `AppController` без префикса. Один endpoint `GET /` → `appService.getHello()`.
- **`app.service.ts`** — `AppService.getHello()` возвращает строку `'Hello World!!'`. Placeholder из стартового шаблона NestJS.
- **`prisma.service.ts`** — `PrismaService extends PrismaClient`. Реализует `OnModuleInit` (`$connect`) и `OnModuleDestroy` (`$disconnect`) — открывает/закрывает соединение с БД на старте/остановке приложения. **Внешняя интеграция:** Prisma Client → PostgreSQL.

#### `src/transactions/`

- **`transactions.module.ts`** — `TransactionsModule`. Регистрирует `TransactionsController` и `TransactionsService`.
- **`transactions.controller.ts`** — `TransactionsController` с префиксом `/transactions`. Пять методов: `create` (POST), `findAll` (GET), `findOne` (GET :id), `update` (PATCH :id), `remove` (DELETE :id). Все делегируют в `TransactionsService`.
- **`transactions.service.ts`** — `TransactionsService` с injected `PrismaService`. Реализованы: `create` (запись в БД через `prisma.transaction.create` со связыванием `user.connect`), `findAll` (`prisma.transaction.findMany`). Методы `findOne`, `update`, `remove` — пока заглушки, возвращают строки. **Внешняя интеграция:** Prisma Client.
- **`dto/create-transaction.dto.ts`** — `CreateTransactionDto`. Поля: `amount: number`, `description: string`, `type: 'INCOME' | 'EXPENSE'`, `userId: number`. Валидация (class-validator) пока не подключена.
- **`dto/update-transaction.dto.ts`** — `UpdateTransactionDto extends PartialType(CreateTransactionDto)`. Все поля опциональны (через `@nestjs/mapped-types`).
- **`entities/transaction.entity.ts`** — `class Transaction {}`. Пустая заглушка от `nest g resource`, не используется (модель транзакции описана в `schema.prisma`).

---

## API Routes

Все маршруты пока без авторизации.

| Method | Route               | Описание                                        | Файл                         | Статус            |
| ------ | ------------------- | ----------------------------------------------- | ---------------------------- | ----------------- |
| GET    | `/`                 | Возвращает строку-приветствие (`Hello World!!`) | `app.controller.ts`          | реализован        |
| POST   | `/transactions`     | Создать транзакцию по `CreateTransactionDto`    | `transactions.controller.ts` | реализован        |
| GET    | `/transactions`     | Получить все транзакции (без пагинации)         | `transactions.controller.ts` | реализован        |
| GET    | `/transactions/:id` | Получить транзакцию по id                       | `transactions.controller.ts` | заглушка (строка) |
| PATCH  | `/transactions/:id` | Обновить транзакцию по id                       | `transactions.controller.ts` | заглушка (строка) |
| DELETE | `/transactions/:id` | Удалить транзакцию по id                        | `transactions.controller.ts` | заглушка (строка) |
