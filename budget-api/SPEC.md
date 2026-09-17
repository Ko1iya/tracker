# SPEC

Живая спецификация структуры проекта `budget-api`. Поддерживается автоматически: каждое изменение кода в `src/`, `prisma/schema.prisma` или `docker-compose.yml` сопровождается обновлением этого файла.

Правила ведения — в корневом `../CLAUDE.md`.

---

## Project Structure

```
budget-api/
├── docker-compose.yml          # PostgreSQL 16 в Docker для локальной разработки
├── prisma/
│   └──  schema.prisma           # Prisma schema: модели User, Category, Account, Transaction
└── src/
    ├── main.ts                 # Точка входа: bootstrap NestJS приложения
    ├── app.module.ts           # Корневой module: ConfigModule (global) + PrismaModule, UsersModule, AuthModule, TransactionsModule, CategoriesModule, AccountsModule
    ├── app.controller.ts       # Базовый controller — GET / возвращает приветствие
    ├── app.service.ts          # Возвращает строку 'Hello World!!'
    ├── prisma/
    │   ├── prisma.module.ts    # NestJS module: провайдит и экспортирует PrismaService для других модулей
    │   └── prisma.service.ts   # Wrapper над PrismaClient: connect/disconnect на lifecycle hooks
    ├── users/
    │   ├── users.module.ts     # NestJS module: импортирует PrismaModule, экспортирует UsersService
    │   └── users.service.ts    # Слой работы с моделью User: findByEmail, findById, create
    ├── auth/
    │   ├── auth.module.ts                  # NestJS module: подключает Passport + JwtModule.registerAsync (читает JWT_SECRET через ConfigService)
    │   ├── auth.controller.ts              # REST endpoints POST /auth/register, POST /auth/login
    │   ├── auth.service.ts                 # bcrypt-хеши паролей + выпуск access JWT через JwtService
    │   ├── registration-allowlist.ts        # Разбор REGISTER_ALLOWED_EMAILS и проверка, разрешён ли email к регистрации
    │   ├── dto/
    │   │   ├── register.dto.ts             # RegisterDto: email (IsEmail), password (MinLength 8)
    │   │   └── login.dto.ts                # LoginDto: email (IsEmail), password (IsString)
    │   ├── strategies/
    │   │   └── jwt.strategy.ts             # passport-jwt стратегия: Bearer-токен → { sub, email } → req.user
    │   ├── guards/
    │   │   └── jwt-auth.guard.ts           # JwtAuthGuard extends AuthGuard('jwt') — для @UseGuards
    │   ├── decorators/
    │   │   └── current-user.decorator.ts   # @CurrentUser() — параметр-декоратор, достающий user из request
    │   └── types/
    │       └── jwt-payload.ts              # Типы JwtPayload (sub, email) и AuthenticatedUser (id, email)
    ├── transactions/
    │   ├── transactions.module.ts                  # NestJS module для домена транзакций
    │   ├── transactions.controller.ts              # REST endpoints (POST/GET/PATCH/DELETE /transactions)
    │   ├── transactions.service.ts                 # Бизнес-логика CRUD + голосовой ввод и pending-категории
    │   ├── transactions.cron.ts                    # Фоновый воркер: авто-подтверждение pending-категорий раз в минуту
    │   └── dto/
    │       ├── create-transaction.dto.ts           # DTO для POST: amount, description, type, categoryId?, accountId?
    │       ├── update-transaction.dto.ts           # DTO для PATCH: PartialType от CreateTransactionDto
    │       └── set-category.dto.ts                 # DTO для PATCH /:id/category: categoryName
    ├── accounts/
    │   ├── accounts.module.ts                      # NestJS module для домена счетов
    │   ├── accounts.controller.ts                  # REST endpoints GET/POST /accounts, PATCH /accounts/:id/default, DELETE /accounts/:id
    │   ├── accounts.service.ts                     # Чтение, создание, смена дефолта и удаление счетов пользователя
    │   └── dto/
    │       └── create-account.dto.ts               # DTO для POST: title
    ├── categories/
    │   ├── categories.module.ts                    # NestJS module для домена категорий
    │   ├── categories.controller.ts                # REST endpoints GET/POST/DELETE /categories
    │   ├── categories.service.ts                   # Чтение, создание и удаление категорий пользователя через PrismaService
    │   ├── normalize-title.ts                      # Нормализация названия категории перед записью
    │   └── dto/
    │       └── create-category.dto.ts              # DTO для POST: title
    └── llm/
        ├── llm.module.ts                           # Изолирует выбор LLM-провайдера за абстракцией TransactionParser (сейчас OpenRouter)
        ├── transaction-parser.ts                   # Абстракция парсера голосовых трат + тип ParsedTransaction
        └── openrouter.parser.ts                    # Боевой парсер на OpenRouter (OpenAI-совместимый API, JSON-ответ)
```

### Описание файлов

#### Корень

- **`docker-compose.yml`** — поднимает контейнер `postgres:16` для локальной БД. База `budget_db`, юзер `myuser`, порт `5432`, данные в volume `postgres_data`.

#### `prisma/`

- **`schema.prisma`** — Prisma schema. Datasource — PostgreSQL через `DATABASE_URL`. Описывает четыре модели (см. ниже).

**Prisma models:**

- **`User`** — пользователь системы. Поля: `id`, `email` (unique), `password`, `createdAt`. Имеет много `Category`, `Account` и `Transaction`.
- **`Category`** — категория трат. Поля: `id`, `title`, `userId`. Принадлежит одному `User`, имеет много `Transaction`. Уникальность `@@unique([userId, title])`
- **`Account`** — счёт, откуда потрачены деньги («Тинькофф», «Наличные»). Поля: `id`, `title`, `isDefault` (default `false`), `userId`. Принадлежит одному `User`, имеет много `Transaction`. Уникальность `@@unique([userId, title])`. Инвариант «ровно один дефолтный счёт на пользователя» держится кодом сервиса (`prisma.$transaction`), ограничения в БД нет.
- **`Transaction`** — транзакция (доход или расход). Поля: `id`, `amount` (Decimal 10,2), `currency` (default "RUB"), `date`, `description?`, `type` ("INCOME" \| "EXPENSE"), `categoryId?`, `accountId?` (связь `onDelete: SetNull` — при удалении счёта обнуляется, транзакция остаётся), `suggestedCategories` (String[], default []), `autoConfirmAt?` (DateTime), `userId`. Привязана к `User` (обязательно) и опционально к `Category`. `suggestedCategories`/`autoConfirmAt` обслуживают голосовой pending-флоу: пока категория не определена, хранят варианты от LLM и дедлайн авто-подтверждения (`autoConfirmAt == null` ⇒ категория решена).

#### `src/`

- **`main.ts`** — точка входа. Создаёт NestJS application через `NestFactory.create(AppModule)`, настраивает CORS (`enableCors`: если задан `CORS_ORIGIN` — список origin через запятую; иначе dev-режим — regex на `localhost`/`127.0.0.1`/приватные подсети `192.168.x.x`, `10.x.x.x` на порту `5173`), регистрирует глобальный `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) и слушает `process.env.PORT ?? 3000`.
- **`app.module.ts`** — корневой `@Module`. Импортирует `ConfigModule.forRoot({ isGlobal: true })`, `ScheduleModule.forRoot()` (включает крон-задачи), `PrismaModule`, `UsersModule`, `AuthModule`, `TransactionsModule`, `CategoriesModule` и `AccountsModule`, регистрирует `AppController`, провайдит `AppService`.
- **`app.controller.ts`** — `AppController` без префикса. Один endpoint `GET /` → `appService.getHello()`.

#### `src/prisma/`

- **`prisma.module.ts`** — `PrismaModule`. Провайдит `PrismaService` и **экспортирует** его, чтобы любой модуль, импортирующий `PrismaModule`, получал общий инстанс (один `PrismaClient` на всё приложение).
- **`prisma.service.ts`** — `PrismaService extends PrismaClient`. Реализует `OnModuleInit` (`$connect`) и `OnModuleDestroy` (`$disconnect`) — открывает/закрывает соединение с БД на старте/остановке приложения. **Внешняя интеграция:** Prisma Client → PostgreSQL.

#### `src/users/`

- **`users.module.ts`** — `UsersModule`. Импортирует `PrismaModule`, провайдит и **экспортирует** `UsersService` для других модулей (в частности, `AuthModule`).
- **`users.service.ts`** — `UsersService` с injected `PrismaService`. Методы: `findByEmail(email)`, `findById(id)`, `create({ email, passwordHash })`. Внутренний слой — контроллера у модуля пока нет, наружу не торчит. **Внешняя интеграция:** Prisma Client.

#### `src/auth/`

- **`auth.module.ts`** — `AuthModule`. Импортирует `UsersModule`, `PassportModule` и `JwtModule.registerAsync` (читает `JWT_SECRET` и `JWT_EXPIRES_IN` через `ConfigService`). Провайдит `AuthService` и `JwtStrategy`, регистрирует `AuthController`.
- **`auth.controller.ts`** — `AuthController` с префиксом `/auth`. Два метода: `register` (POST `/auth/register`), `login` (POST `/auth/login`, `@HttpCode(200)`). Тело валидируется через `RegisterDto`/`LoginDto`.
- **`auth.service.ts`** — `AuthService` с injected `UsersService`, `JwtService` и `ConfigService`. `register` — сначала сверяет email с белым списком `REGISTER_ALLOWED_EMAILS` (403 Forbidden, если не в списке; проверка идёт до всего остального, чтобы по коду ответа нельзя было узнать, кто зарегистрирован), затем проверяет уникальность email (409 Conflict), хеширует пароль `bcrypt.hash` (10 rounds), создаёт юзера, возвращает `{ accessToken, user: { id, email } }`. `login` — `findByEmail` + `bcrypt.compare`, при ошибке — 401 Unauthorized. **Внешняя интеграция:** `bcrypt`, `@nestjs/jwt`.
- **`registration-allowlist.ts`** — чистые функции белого списка регистрации. `parseAllowedEmails(raw)` разбирает переменную окружения `REGISTER_ALLOWED_EMAILS` (адреса через запятую) в массив: trim, нижний регистр, пустые куски отбрасываются. `isEmailAllowed(email, allowed)` — проверка вхождения без учёта регистра. Переменная не задана ⇒ список пуст ⇒ регистрация закрыта для всех («по умолчанию закрыто»).
- **`dto/register.dto.ts`** — `RegisterDto`. Поля: `email` (`@IsEmail`), `password` (`@IsString`, `@MinLength(8)`).
- **`dto/login.dto.ts`** — `LoginDto`. Поля: `email` (`@IsEmail`), `password` (`@IsString`).
- **`strategies/jwt.strategy.ts`** — `JwtStrategy extends PassportStrategy(Strategy)`. Извлекает токен из `Authorization: Bearer …`, проверяет подпись секретом из `JWT_SECRET`. `validate(payload)` → `AuthenticatedUser { id, email }`, которая ложится в `request.user`. **Внешняя интеграция:** `passport-jwt`.
- **`decorators/current-user.decorator.ts`** — `@CurrentUser()`. Параметр-декоратор, возвращающий `AuthenticatedUser` из `request.user` (заполняется `JwtStrategy.validate`).
- **`types/jwt-payload.ts`** — типы `JwtPayload { sub: number; email: string }` (то, что подписываем в токен) и `AuthenticatedUser { id: number; email: string }` (то, что доступно в `req.user`).

#### `src/transactions/`

- **`transactions.module.ts`** — `TransactionsModule`. Импортирует `PrismaModule` и `LlmModule`, регистрирует `TransactionsController`, провайдит `TransactionsService` и `TransactionsCron`.
- **`transactions.controller.ts`** — `TransactionsController` с префиксом `/transactions`. Целиком закрыт `@UseGuards(JwtAuthGuard)` — все методы требуют валидный JWT. `userId` достаётся из токена через `@CurrentUser()` и пробрасывается в сервис. Методы: `create` (POST), `createFromVoice` (POST `/voice` — приём аудио через `FileInterceptor('audio')`, валидация `ParseFilePipe`: размер ≤ 1 МБ, mime `audio/*`), `findAll` (GET, с query `limit`/`offset` через `ParseIntPipe({ optional: true })`), `findOne` (GET :id), `setCategory` (PATCH `:id/category` — тело `SetCategoryDto`), `update` (PATCH :id), `remove` (DELETE :id). Параметр `:id` валидируется `ParseIntPipe`. **Внешняя интеграция:** `multer` (через `@nestjs/platform-express`, memory storage по умолчанию).
- **`transactions.service.ts`** — `TransactionsService` с injected `PrismaService`, `ConfigService` и `TransactionParser` (LLM-абстракция). Все CRUD-методы принимают `userId` первым параметром и фильтруют/связывают по нему. Реализованы: `create(userId, dto)` (`prisma.transaction.create` со связыванием `user.connect`; при заданном `dto.categoryId` — `category.connect`; счёт не передан — подставляется дефолтный счёт пользователя, счетов нет — `accountId` остаётся `null`), `findAll(userId, limit?, offset?)` (`findMany` с `where: { userId }`, `orderBy: { date: 'desc' }`, дефолтный `limit=50`, максимум `100`), `findOne(userId, id)` (`findFirst` с `where: { id, userId }`; null → `NotFoundException`), `update(userId, id, dto)` (`updateMany` с `where: { id, userId }`; `count === 0` → `NotFoundException`, иначе возвращает запись через `findUnique`), `remove(userId, id)` (`deleteMany` с `where: { id, userId }`; `count === 0` → `NotFoundException`), `createFromVoice(userId, file)` (**вся цепочка Этапа 3**: `transcribe` → `parser.parse` → сохранение; если LLM сматчил категорию пользователя — связывает сразу, иначе создаёт без категории с `suggestedCategories` и дедлайном `autoConfirmAt = now + 5 мин`; счёт из речи сопоставляется с списком счетов пользователя без учёта регистра, не назван/не совпал — подставляется дефолтный, счетов нет — `null`; возвращает транзакцию с флагом `categoryPending`; при `DEBUG_VOICE=true` логирует транскрипт/категории/сырой ответ LLM и добавляет их в ответ полем `_debug`, в БД эти данные не пишутся), `setCategory(userId, id, categoryName)` (upsert-ит категорию по ключу `userId_title`, привязывает её, гасит `autoConfirmAt`; 404 если транзакция чужая), `autoConfirmPending()` (для крона: берёт транзакции с истёкшим `autoConfirmAt`, подставляет `suggestedCategories[0]` через `setCategory` либо просто снимает с ожидания; возвращает число обработанных). Приватные: `transcribe(file)` — отправляет `file.buffer` (Blob → FormData) в Nexara, читает `NEXARA_API_KEY` через `ConfigService` (нет ключа → 500; сеть упала → 503; не-OK/пустой ответ → 502); `assertCategoryOwned(userId, categoryId)` — проверка владения категорией (иначе `NotFoundException`); `assertAccountOwned(userId, accountId)` — то же для счёта; `findDefaultAccountId(userId)` — id дефолтного счёта или `null`; `withPendingFlag(tx)` — добавляет вычисляемый `categoryPending`. **Внешняя интеграция:** Prisma Client, Nexara Audio API (speech-to-text, `fetch`), LLM через `TransactionParser`.
- **`transactions.cron.ts`** — `TransactionsCron` с injected `TransactionsService`. Метод `autoConfirmPending` помечен `@Cron(CronExpression.EVERY_MINUTE)` — раз в минуту дёргает `TransactionsService.autoConfirmPending()` и логирует число авто-подтверждённых категорий. Расписание отделено от HTTP-сервиса. **Внешняя интеграция:** `@nestjs/schedule`.
- **`dto/create-transaction.dto.ts`** — `CreateTransactionDto`. Поля с валидацией: `amount` (`@IsNumber({ maxDecimalPlaces: 2 })`, `@IsPositive`), `description?` (`@IsOptional`, `@IsString`, `@MaxLength(255)`), `type` (`@IsIn(['INCOME', 'EXPENSE'])`), `categoryId?` (`@IsOptional`, `@IsInt`, `@IsPositive`), `accountId?` (`@IsOptional`, `@IsInt`, `@IsPositive`). `userId` в DTO **нет** — берётся из JWT.
- **`dto/update-transaction.dto.ts`** — `UpdateTransactionDto extends PartialType(CreateTransactionDto)`. Все поля опциональны (через `@nestjs/mapped-types`), валидация наследуется.
- **`dto/set-category.dto.ts`** — `SetCategoryDto`. Поле `categoryName` (`@IsString`, `@MinLength(1)`, `@MaxLength(50)`). Тело `PATCH /transactions/:id/category`.

#### `src/accounts/`

- **`accounts.module.ts`** — `AccountsModule`. Импортирует `PrismaModule`, регистрирует `AccountsController` и `AccountsService`.
- **`accounts.controller.ts`** — `AccountsController` с префиксом `/accounts`. Закрыт `@UseGuards(JwtAuthGuard)`. Методы: `findAll` (GET `/accounts`), `create` (POST `/accounts`, тело — `CreateAccountDto`), `setDefault` (PATCH `/accounts/:id/default`), `remove` (DELETE `/accounts/:id`, `@HttpCode(204)`). `:id` через `ParseIntPipe`, `userId` из токена через `@CurrentUser()`.
- **`accounts.service.ts`** — `AccountsService` с injected `PrismaService`. Методы: `findAll(userId)` — `findMany` с `orderBy: { title: 'asc' }`, `_count.transactions` разворачивается в плоское `transactionCount`; `create(userId, dto)` — внутри `prisma.$transaction` считает счета пользователя и ставит `isDefault: true` первому; P2002 → `ConflictException`; `setDefault(userId, id)` — снимает флаг со всех счетов пользователя и ставит одному, обе операции в `prisma.$transaction`; `remove(userId, id)` — удаляет счёт (транзакциям `accountId` обнуляет сама БД через `onDelete: SetNull`), и если удалён дефолтный — назначает дефолтным первый по алфавиту из оставшихся. Приватный `assertOwned(userId, id)` — 404, если счёта нет или он чужой. **Внешняя интеграция:** Prisma Client.
- **`dto/create-account.dto.ts`** — `CreateAccountDto`. Поле `title` (`@IsString`, `@MinLength(1)`, `@MaxLength(50)`).

#### `src/categories/`

- **`categories.module.ts`** — `CategoriesModule`. Импортирует `PrismaModule`, регистрирует `CategoriesController` и `CategoriesService`.
- **`categories.controller.ts`** — `CategoriesController` с префиксом `/categories`. Закрыт `@UseGuards(JwtAuthGuard)`. Методы: `findAll` (GET `/categories`), `create` (POST `/categories`, тело — `CreateCategoryDto`), `remove` (DELETE `/categories/:id`, `@HttpCode(204)`, `:id` через `ParseIntPipe`). `userId` берётся из токена через `@CurrentUser()`.
- **`categories.service.ts`** — `CategoriesService` с injected `PrismaService`. Методы: `findAll(userId)` — `findMany` с `where: { userId }`, `orderBy: { title: 'asc' }`, `_count.transactions` разворачивается в плоское поле `transactionCount`; `create(userId, dto)` — `prisma.category.create` со связыванием `user.connect`; ловит P2002 → `ConflictException`; `remove(userId, id)` — `findUnique` с `_count.transactions`; нет/чужая → `NotFoundException` (404), есть транзакции → `ConflictException` (409), иначе `delete`. **Внешняя интеграция:** Prisma Client.
- **`dto/create-category.dto.ts`** — `CreateCategoryDto`. Поле `title` (`@IsString`, `@MinLength(1)`, `@MaxLength(50)`).

#### `src/llm/`

- **`llm.module.ts`** — `LlmModule`. Провайдит абстракцию `TransactionParser` через `{ provide: TransactionParser, useClass: OpenRouterTransactionParser }` и **экспортирует** её. Точка переключения LLM-провайдера: меняешь `useClass`; для fallback из нескольких провайдеров сюда подставляется композитный парсер.
- **`transaction-parser.ts`** — абстрактный класс `TransactionParser` (служит и типом, и DI-токеном) с методом `parse(text, categoryTitles, accountTitles): Promise<ParsedTransaction>`. Тип `ParsedTransaction` — узкий набор полей, извлекаемых из текста: `amount`, `currency`, `description`, `type` (`INCOME`/`EXPENSE`), `category` (имя или null), `suggestedCategories` (string[]), `account` (название счёта из списка пользователя или null), `raw?` (сырой ответ провайдера, только для отладки). Поля `id`/`userId`/`date` намеренно отсутствуют — это серверные поля.
- **`openrouter.parser.ts`** — `OpenRouterTransactionParser extends TransactionParser` с injected `ConfigService`. Боевой парсер: ходит в OpenRouter через `openai` SDK как drop-in (`baseURL: https://openrouter.ai/api/v1`, OpenAI-совместимый `chat.completions.create`) модели `OPENROUTER_MODEL` (дефолт `xiaomi/mimo-v2.5`) с `system`-инструкцией (форма JSON описана прямо в промпте; в user-промпт уходят списки категорий и счетов пользователя, поле `account` модель обязана брать строго из списка или вернуть `null`) и `response_format: { type: 'json_object' }`, затем `normalize` подстраховывает типы и кладёт сырой ответ в `raw` (для отладки). Нет ключа → 500; сбой API → 503; пустой/невалидный JSON → 502. **Внешняя интеграция:** OpenRouter API (`openai` SDK), читает `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` через `ConfigService`.

---

## API Routes

| Method | Route                 | Описание                                                                                                             | Файл                         | Статус                |
| ------ | --------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------- |
| GET    | `/`                   | Возвращает строку-приветствие (`Hello World!!`)                                                                      | `app.controller.ts`          | реализован, публичный |
| POST   | `/auth/register`      | Регистрация по `RegisterDto`. Возвращает `{ accessToken, user }`. 403 если email не в `REGISTER_ALLOWED_EMAILS` (регистрация по приглашению), 409 если email занят | `auth.controller.ts`         | реализован, публичный |
| POST   | `/auth/login`         | Логин по `LoginDto`. Возвращает `{ accessToken, user }`. 401 при неверной паре                                       | `auth.controller.ts`         | реализован, публичный |
| GET    | `/categories`         | Список категорий текущего пользователя, сортировка по `title` ASC. Каждый элемент содержит `transactionCount`        | `categories.controller.ts`   | реализован            |
| POST   | `/categories`         | Создать категорию по `CreateCategoryDto` (поле `title`). 409, если у пользователя уже есть категория с таким `title` | `categories.controller.ts`   | реализован            |
| DELETE | `/categories/:id`     | Удалить категорию по id. 204 при успехе, 400 если `id` не число, 404 если нет/чужая, 409 если используется транзакциями | `categories.controller.ts`   | реализован            |
| GET    | `/accounts`           | Список счетов текущего пользователя, сортировка по `title` ASC. Каждый элемент содержит `isDefault` и `transactionCount` | `accounts.controller.ts`     | реализован            |
| POST   | `/accounts`           | Создать счёт по `CreateAccountDto` (поле `title`). Первый счёт пользователя становится дефолтным. 409, если такой `title` уже есть | `accounts.controller.ts`     | реализован            |
| PATCH  | `/accounts/:id/default` | Сделать счёт дефолтным (флаг снимается со всех остальных). 404, если счёта нет/чужой                                | `accounts.controller.ts`     | реализован            |
| DELETE | `/accounts/:id`       | Удалить счёт по id. 204 при успехе, 404 если нет/чужой. Транзакциям счёта БД проставляет `accountId = null`; если удалён дефолтный — дефолтным становится первый по алфавиту из оставшихся | `accounts.controller.ts`     | реализован            |
| POST   | `/transactions`       | Создать транзакцию по `CreateTransactionDto` (опц. `categoryId` — 404, если категория чужая/не существует; опц. `accountId` — 404 для чужого, не передан — подставляется дефолтный счёт) | `transactions.controller.ts` | реализован            |
| POST   | `/transactions/voice` | Приём аудиофайла (поле формы `audio`, ≤ 1 МБ, mime `audio/*`). Аудио (Nexara) → текст → LLM-парсинг (OpenRouter) → создание транзакции. Возвращает транзакцию + `suggestedCategories` + `categoryPending` (+ `_debug` при `DEBUG_VOICE=true`) | `transactions.controller.ts` | реализован |
| GET    | `/transactions`       | Список транзакций, сортировка по `date` DESC. Query: `limit` (default 50, max 100), `offset` (default 0)             | `transactions.controller.ts` | реализован            |
| GET    | `/transactions/:id`   | Получить транзакцию по id. 404, если нет/чужая                                                                       | `transactions.controller.ts` | реализован            |
| PATCH  | `/transactions/:id/category` | Уточнить категорию pending-транзакции по `SetCategoryDto` (`categoryName`). Находит-или-создаёт категорию, гасит авто-подтверждение. 404, если транзакция чужая | `transactions.controller.ts` | реализован            |
| PATCH  | `/transactions/:id`   | Обновить транзакцию по id. 404, если нет/чужая                                                                       | `transactions.controller.ts` | реализован            |
| DELETE | `/transactions/:id`   | Удалить транзакцию по id. 404, если нет в БД                                                                         | `transactions.controller.ts` | реализован            |
