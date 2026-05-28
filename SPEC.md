# SPEC

Живая спецификация структуры проекта `budget-web`. Поддерживается автоматически: каждое изменение кода в `src/`, `index.html` или `vite.config.ts` сопровождается обновлением этого файла.

Правила ведения — в `CLAUDE.md`.

---

## Project Structure

```
budget-web/
├── index.html                 # HTML-шаблон Vite: lang="ru", контейнер #root, подключает /src/main.tsx
├── vite.config.ts             # Конфиг Vite: плагины @vitejs/plugin-react и @tailwindcss/vite
└── src/
    ├── main.tsx               # Точка входа: монтирует <App /> в #root, оборачивает в QueryClientProvider (TanStack Query)
    ├── App.tsx                # Корневой компонент: настраивает клиентский роутинг (BrowserRouter + Routes)
    ├── index.css              # Tailwind + тема shadcn/ui (CSS-переменные, шрифт Inter, light/dark)
    ├── vite-env.d.ts          # Типы Vite-окружения: объявляет import.meta.env.VITE_API_URL
    ├── lib/                   # Инфраструктура, не зависящая от фич
    │   ├── utils.ts           # Утилита cn() для склейки classNames (clsx + tailwind-merge)
    │   ├── token.ts           # Хранение JWT-токена в localStorage: getToken/setToken/clearToken
    │   ├── api.ts             # axios-клиент к budget-api: baseURL из env, JWT-перехватчик, обработка 401
    │   ├── queryClient.ts     # Глобальный QueryClient (TanStack Query) с дефолтными опциями кеша
    │   └── format.ts          # Форматирование дат и денег через Intl: formatCurrency, formatDate
    ├── features/              # Бизнес-фичи: каждая со своими api/hooks/типами
    │   ├── auth/
    │   │   ├── api.ts         # login() → POST /auth/login; типы AuthUser, AuthResponse
    │   │   ├── schema.ts      # zod-схема формы входа loginSchema + тип LoginFormValues
    │   │   └── hooks.ts       # useLogin (мутация входа), useLogout (разлогин)
    │   └── transactions/
    │       ├── api.ts         # getTransactions(), createTransaction(), createTransactionFromVoice(); типы Transaction, TransactionType, CreateTransactionInput
    │       ├── keys.ts        # Реестр query-ключей TanStack Query (transactionKeys)
    │       ├── hooks.ts       # useTransactions, useCreateTransaction, useCreateTransactionFromVoice (все с инвалидацией кеша ленты)
    │       ├── schema.ts      # zod-схема формы создания createTransactionSchema + тип CreateTransactionFormValues
    │       ├── categories.ts  # Заглушка категорий CATEGORY_OPTIONS (бэкенд категории пока не принимает)
    │       ├── totals.ts      # monthlyExpenses — расходы за текущий месяц (чистая функция)
    │       ├── AddTransactionDialog.tsx # Модалка ручного добавления транзакции (форма + триггер «+»)
    │       └── VoiceRecorderButton.tsx # Кнопка голосового ввода: MediaRecorder → POST /transactions/voice
    ├── components/
    │   ├── Layout.tsx         # Визуальный каркас авторизованных страниц: навигация + <Outlet />
    │   ├── ProtectedRoute.tsx # Гард доступа: без JWT редиректит на /login
    │   └── ui/
    │       ├── button.tsx     # Компонент Button (shadcn/ui): варианты и размеры через cva
    │       ├── input.tsx      # Компонент Input (shadcn/ui): стилизованное текстовое поле
    │       ├── label.tsx      # Компонент Label (shadcn/ui): подпись к полю формы
    │       ├── dialog.tsx     # Модальное окно (shadcn/ui, Radix Dialog): набор Dialog*-частей
    │       └── select.tsx     # Выпадающий список (shadcn/ui, Radix Select): набор Select*-частей
    └── pages/
        ├── HomePage.tsx       # Главная: лента расходов и сводка за месяц
        ├── LoginPage.tsx      # Страница входа (форма на react-hook-form + zod), вне Layout
        └── SettingsPage.tsx   # Страница настроек (заглушка)
```

### Описание файлов

#### Корень

- **`index.html`** — HTML-шаблон Vite. `<html lang="ru">`, `<title>Tracker — AI Budget App</title>`, контейнер `<div id="root">` и подключение модуля `/src/main.tsx`.
- **`vite.config.ts`** — конфиг Vite. Плагины: `@vitejs/plugin-react` (Fast Refresh + JSX-трансформация) и `@tailwindcss/vite` (компиляция Tailwind CSS v4).

#### `src/`

- **`main.tsx`** — точка входа. Берёт `#root`, создаёт React-корень через `createRoot` и рендерит `<App />` внутри `<StrictMode>`, обёрнутый в `QueryClientProvider` (TanStack Query) с клиентом из `lib/queryClient.ts`. Импортирует глобальный `index.css`.
- **`App.tsx`** — `App`, корневой компонент (default export). Настраивает роутинг через `BrowserRouter` / `Routes` (react-router-dom): `/login` — отдельно; закрытая зона (`/`, `/settings` и фолбэк `*`) обёрнута в `ProtectedRoute` (гард доступа), внутри — `Layout` (визуальный каркас).
- **`index.css`** — глобальные стили. `@import 'tailwindcss'` подключает Tailwind v4 (preflight-сброс). Дальше — тема shadcn/ui: CSS-переменные дизайн-токенов (`--background`, `--primary` и т.д.) в `:root` и `.dark`, маппинг токенов в Tailwind через `@theme inline`, шрифт Inter (`@fontsource-variable/inter`), `@layer base` для базовых стилей `body`/`html`.
- **`vite-env.d.ts`** — декларации типов окружения Vite. Подключает `vite/client` и типизирует `import.meta.env.VITE_API_URL` (базовый URL `budget-api`).

#### `src/lib/` (инфраструктура, не зависит от фич)

- **`utils.ts`** — утилита `cn(...)` (named export): объединяет классы через `clsx` и снимает конфликты Tailwind через `tailwind-merge`. Используется всеми компонентами shadcn/ui.
- **`token.ts`** — низкоуровневое хранилище JWT-токена в `localStorage` (named exports `getToken`, `setToken`, `clearToken`). Токен budget-api выдаёт на `POST /auth/login`; он нужен в заголовке `Authorization: Bearer <token>` для защищённых эндпоинтов. Слой `lib` не знает про фичу `auth` — наоборот, фича и axios-клиент пользуются этими функциями.
- **`api.ts`** — `api` (named export), настроенный axios-инстанс к `budget-api`. `baseURL` из `import.meta.env.VITE_API_URL`. Request-перехватчик подставляет JWT из `token.ts` в заголовок `Authorization`; response-перехватчик при ответе `401` чистит токен и редиректит на `/login`.
- **`queryClient.ts`** — `queryClient` (named export), глобальный `QueryClient` (TanStack Query). Дефолтные опции: `staleTime` 60с, без рефетча по фокусу окна, один повтор при ошибке. Подключается в `main.tsx`.
- **`format.ts`** — форматирование через встроенный `Intl` (named exports `formatCurrency`, `formatDate`). `formatCurrency(amount, currency)` — деньги в локали `ru-RU` (кеширует `Intl.NumberFormat` по валюте); `formatDate(date)` — дата вида «5 мая». `amount` принимается строкой/числом (с бэкенда приходит строкой из-за Prisma `Decimal`).

#### `src/features/auth/`

- **`api.ts`** — `login(email, password)` (named export): `POST /auth/login` в budget-api, возвращает `{ accessToken, user }`. Типы `AuthUser`, `AuthResponse`. При неверных данных бэкенд отвечает 401.
- **`schema.ts`** — `loginSchema` (zod) и выводимый из неё тип `LoginFormValues` (named exports). Клиентская валидация формы входа; поля синхронны с `LoginDto` бэкенда (email, password).
- **`hooks.ts`** — `useLogin` и `useLogout` (named exports). `useLogin` — мутация TanStack Query: вызывает `login()`, при успехе сохраняет JWT (`setToken`) и уходит на `/`. `useLogout` — колбэк: чистит токен и уходит на `/login` (сетевого запроса нет, JWT stateless).

#### `src/features/transactions/`

- **`api.ts`** — функции запросов к budget-api (named exports). `getTransactions()` — `GET /transactions` (требует JWT), возвращает массив транзакций. `createTransaction(input)` — `POST /transactions` (требует JWT), создаёт транзакцию; `userId` бэкенд берёт из JWT, `currency`/`date` проставляет дефолтами. `createTransactionFromVoice(blob, filename)` — `POST /transactions/voice` (multipart, поле `audio`, требует JWT): отправляет записанное аудио, бэкенд транскрибирует и парсит LLM, возвращает уже созданную транзакцию. Типы `Transaction` (поле `amount` — строка, т.к. Prisma `Decimal`; плюс `suggestedCategories: string[]` и `autoConfirmAt: string | null` для pending-категории; опц. `categoryPending` — приходит только в ответах voice/PATCH), `TransactionType` (`INCOME` | `EXPENSE`) и `CreateTransactionInput` (`amount`, `type`, опц. `description` — без категории, бэкенд её пока не принимает).
- **`keys.ts`** — `transactionKeys` (named export), реестр query-ключей TanStack Query. Централизует ключи кеша, чтобы чтение и инвалидации (после создания) использовали одни и те же значения.
- **`hooks.ts`** — `useTransactions`, `useCreateTransaction`, `useCreateTransactionFromVoice` (named exports). `useTransactions` — чтение списка через `useQuery` под ключом `transactionKeys.all`. `useCreateTransaction` — мутация ручного создания. `useCreateTransactionFromVoice` — мутация голосового ввода (на вход `{ audio, filename }`). Обе мутации после успеха инвалидируют `transactionKeys.all`, чтобы лента сама перезапросилась.
- **`schema.ts`** — `createTransactionSchema` (zod) и выводимый тип `CreateTransactionFormValues` (named exports). Клиентская валидация формы создания; поля `amount`/`description`/`type` синхронны с `CreateTransactionDto` бэкенда. `amount` приводится из строки `<input>` через `z.coerce`. `categoryId` — только для UI, на сервер не уходит.
- **`categories.ts`** — `CATEGORY_OPTIONS` и тип `CategoryOption` (named exports). Захардкоженный список категорий — заглушка: budget-api пока не отдаёт категории (`GET /categories`) и не принимает `categoryId` при создании. Заменить на загрузку через `useQuery`, когда появится эндпоинт.
- **`totals.ts`** — `monthlyExpenses(transactions)` (named export): чистая функция, сумма расходов (EXPENSE) за текущий календарный месяц.
- **`AddTransactionDialog.tsx`** — `AddTransactionDialog` (default export). Модальное окно ручного добавления транзакции: само хранит open-состояние и рендерит триггер «+». Форма на `react-hook-form` + `zodResolver` (`createTransactionSchema`); поля Сумма, Описание, Тип (Расход/Доход) и Категория. Сохраняет через `useCreateTransaction`; категорию на сервер не отправляет (бэкенд её не принимает).
- **`VoiceRecorderButton.tsx`** — `VoiceRecorderButton` (default export). Кнопка голосового ввода. Через `navigator.mediaDevices.getUserMedia` запрашивает микрофон, пишет звук браузерным `MediaRecorder` (подбирает поддерживаемый mime: `audio/webm;codecs=opus`, fallback `audio/mp4` для Safari) и по второму тапу отправляет blob через `useCreateTransactionFromVoice`. Авто-стоп через 60с — страховка от лимита 1 МБ на бэке. Сама показывает три состояния (idle/recording/«Распознаём…») и ошибки доступа к микрофону; pending-категория транзакции пока специально не отображается.

#### `src/components/`

- **`Layout.tsx`** — `Layout` (default export). Визуальный каркас авторизованных страниц: шапка с `NavLink`-навигацией (Главная, Настройки) и кнопкой «Выход» (через `useLogout`); `<Outlet />` под вложенные страницы. Стили — Tailwind. Проверку доступа делает `ProtectedRoute` выше по дереву.
- **`ProtectedRoute.tsx`** — `ProtectedRoute` (default export). Гард доступа: при отсутствии JWT-токена редиректит на `/login` (`<Navigate replace />`), иначе рендерит `<Outlet />`. Отделён от `Layout`, чтобы доступ и вёрстка были разными ответственностями.

#### `src/components/ui/` (shadcn/ui)

- **`button.tsx`** — `Button` (named export) и `buttonVariants`. Компонент кнопки shadcn/ui: варианты (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) и размеры через `class-variance-authority`. Поддерживает `asChild` (рендер как дочерний элемент через Radix `Slot`).
- **`input.tsx`** — `Input` (named export). Стилизованное текстовое поле shadcn/ui (обёртка над `<input>` с классами темы). Используется в формах, например на странице входа.
- **`label.tsx`** — `Label` (named export). Подпись к полю формы (обёртка над Radix `Label`). Используется в форме добавления транзакции.
- **`dialog.tsx`** — модальное окно shadcn/ui поверх Radix `Dialog` (named exports `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `DialogClose`, `DialogDescription`, `DialogOverlay`, `DialogPortal`). Используется в `AddTransactionDialog`.
- **`select.tsx`** — выпадающий список shadcn/ui поверх Radix `Select` (named exports `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator` и др.). Используется для полей Тип и Категория в `AddTransactionDialog`.

#### `src/pages/`

- **`HomePage.tsx`** — `HomePage` (default export). Главная страница: через `useTransactions` грузит транзакции, считает расходы за месяц (`monthlyExpenses`) и выводит ленту с форматированием даты/валюты (`formatDate`, `formatCurrency`). В шапке ленты — `VoiceRecorderButton` (голосовой ввод) и `AddTransactionDialog` (кнопка «+» для ручного ввода).
- **`LoginPage.tsx`** — `LoginPage` (default export). Страница входа вне `Layout`. Форма на `react-hook-form` + `zodResolver` (валидация по `loginSchema`); вход через хук `useLogin`. Показывает ошибки валидации полей и серверную ошибку при 401/недоступном бэкенде.
- **`SettingsPage.tsx`** — `SettingsPage` (default export). Страница настроек. Сейчас заглушка.

---

## Routes

Клиентский роутинг — `react-router-dom` (BrowserRouter), настроен в `App.tsx`.

| Path        | Страница/компонент | Описание                                        | Файл                       | Статус   |
| ----------- | ------------------ | ----------------------------------------------- | -------------------------- | -------- |
| `/`         | `HomePage`         | Лента расходов и сводка за месяц (внутри Layout, требует авторизации) | `src/pages/HomePage.tsx`   | готово   |
| `/settings` | `SettingsPage`     | Настройки (внутри Layout, требует авторизации)  | `src/pages/SettingsPage.tsx` | заглушка |
| `/login`    | `LoginPage`        | Вход, отдельно от Layout (без навигации)        | `src/pages/LoginPage.tsx`  | готово   |
| `*`         | `HomePage`         | Фолбэк внутри закрытой зоны: неизвестный путь ведёт на главную (без токена — на `/login`) | `src/App.tsx`              | готово   |
