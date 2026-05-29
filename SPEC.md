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
    │   ├── categories/
    │   │   ├── api.ts         # getCategories(), createCategory(), normalizeCategoryTitle(); тип Category
    │   │   ├── keys.ts        # Реестр query-ключей TanStack Query (categoryKeys)
    │   │   └── hooks.ts       # useCategories (чтение списка), useCreateCategory (мутация создания)
    │   └── transactions/
    │       ├── api.ts         # getTransactions(), createTransaction(), createTransactionFromVoice(), setTransactionCategory(); типы Transaction, TransactionType, CreateTransactionInput
    │       ├── keys.ts        # Реестр query-ключей TanStack Query (transactionKeys)
    │       ├── hooks.ts       # useTransactions, useCreateTransaction, useCreateTransactionFromVoice, useSetTransactionCategory (все мутации инвалидируют кеш ленты)
    │       ├── schema.ts      # zod-схема формы создания createTransactionSchema + тип CreateTransactionFormValues
    │       ├── totals.ts      # monthlyExpenses (расходы за месяц), topCategoryIds (частые категории) — чистые функции
    │       ├── AddTransactionDialog.tsx # Модалка ручного добавления транзакции (форма + триггер «+»)
    │       ├── CategoryPicker.tsx       # Поле выбора категории: радиокнопки топ-частых + ручной ввод с автодополнением
    │       ├── VoiceRecorderButton.tsx  # Кнопка голосового ввода: MediaRecorder → POST /transactions/voice
    │       └── CategoryPendingBadge.tsx # Бейдж pending-категории + панель выбора (suggestedCategories / своя)
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
- **`vite.config.ts`** — конфиг Vite. Плагины: `@vitejs/plugin-react` (Fast Refresh + JSX-трансформация) и `@tailwindcss/vite` (компиляция Tailwind CSS v4). `server.host: true` — dev-сервер слушает на всех сетевых интерфейсах (доступ с телефона по IP). `server.proxy` — запросы на `/api` проксируются на budget-api (`http://localhost:3000`) с отрезанием префикса `/api`; так фронт и API для браузера остаются одним origin (CORS не задействуется).

#### `src/`

- **`main.tsx`** — точка входа. Берёт `#root`, создаёт React-корень через `createRoot` и рендерит `<App />` внутри `<StrictMode>`, обёрнутый в `QueryClientProvider` (TanStack Query) с клиентом из `lib/queryClient.ts`. Импортирует глобальный `index.css`.
- **`App.tsx`** — `App`, корневой компонент (default export). Настраивает роутинг через `BrowserRouter` / `Routes` (react-router-dom): `/login` — отдельно; закрытая зона (`/`, `/settings` и фолбэк `*`) обёрнута в `ProtectedRoute` (гард доступа), внутри — `Layout` (визуальный каркас).
- **`index.css`** — глобальные стили. `@import 'tailwindcss'` подключает Tailwind v4 (preflight-сброс). Дальше — тема shadcn/ui: CSS-переменные дизайн-токенов (`--background`, `--primary` и т.д.) в `:root` и `.dark`, маппинг токенов в Tailwind через `@theme inline`, шрифт Inter (`@fontsource-variable/inter`), `@layer base` для базовых стилей `body`/`html`.
- **`vite-env.d.ts`** — декларации типов окружения Vite. Подключает `vite/client` и типизирует `import.meta.env.VITE_API_URL` (базовый URL `budget-api`).

#### `src/lib/` (инфраструктура, не зависит от фич)

- **`utils.ts`** — утилита `cn(...)` (named export): объединяет классы через `clsx` и снимает конфликты Tailwind через `tailwind-merge`. Используется всеми компонентами shadcn/ui.
- **`token.ts`** — низкоуровневое хранилище JWT-токена в `localStorage` (named exports `getToken`, `setToken`, `clearToken`). Токен budget-api выдаёт на `POST /auth/login`; он нужен в заголовке `Authorization: Bearer <token>` для защищённых эндпоинтов. Слой `lib` не знает про фичу `auth` — наоборот, фича и axios-клиент пользуются этими функциями.
- **`api.ts`** — `api` (named export), настроенный axios-инстанс к `budget-api`. `baseURL` из `import.meta.env.VITE_API_URL` (= `/api`, проксируется dev-сервером Vite на бэкенд). Request-перехватчик подставляет JWT из `token.ts` в заголовок `Authorization`; response-перехватчик при ответе `401` чистит токен и редиректит на `/login`.
- **`queryClient.ts`** — `queryClient` (named export), глобальный `QueryClient` (TanStack Query). Дефолтные опции: `staleTime` 60с, без рефетча по фокусу окна, один повтор при ошибке. Подключается в `main.tsx`.
- **`format.ts`** — форматирование через встроенный `Intl` (named exports `formatCurrency`, `formatDate`). `formatCurrency(amount, currency)` — деньги в локали `ru-RU` (кеширует `Intl.NumberFormat` по валюте); `formatDate(date)` — дата вида «5 мая». `amount` принимается строкой/числом (с бэкенда приходит строкой из-за Prisma `Decimal`).

#### `src/features/auth/`

- **`api.ts`** — `login(email, password)` (named export): `POST /auth/login` в budget-api, возвращает `{ accessToken, user }`. Типы `AuthUser`, `AuthResponse`. При неверных данных бэкенд отвечает 401.
- **`schema.ts`** — `loginSchema` (zod) и выводимый из неё тип `LoginFormValues` (named exports). Клиентская валидация формы входа; поля синхронны с `LoginDto` бэкенда (email, password).
- **`hooks.ts`** — `useLogin` и `useLogout` (named exports). `useLogin` — мутация TanStack Query: вызывает `login()`, при успехе сохраняет JWT (`setToken`) и уходит на `/`. `useLogout` — колбэк: чистит токен и уходит на `/login` (сетевого запроса нет, JWT stateless).

#### `src/features/categories/`

- **`api.ts`** — функции запросов к budget-api (named exports). `getCategories()` — `GET /categories` (требует JWT), возвращает массив категорий пользователя. `createCategory(title)` — `POST /categories` (требует JWT): создаёт категорию по названию; бэкенд нормализует `title` и при дубликате (`userId+title`) отвечает 409. `normalizeCategoryTitle(raw)` — фронтовая копия серверной нормализации (trim + первая буква в верхний регистр), чтобы до запроса найти уже существующую категорию и не ловить лишний 409. Тип `Category` (`id`, `title`, `userId`).
- **`keys.ts`** — `categoryKeys` (named export), реестр query-ключей TanStack Query для категорий. Чтение и инвалидация (после создания) используют один ключ.
- **`hooks.ts`** — `useCategories`, `useCreateCategory` (named exports). `useCategories` — чтение списка через `useQuery` под ключом `categoryKeys.all`. `useCreateCategory` — мутация создания категории; после успеха инвалидирует `categoryKeys.all`, чтобы новая категория сразу появилась в выпадающем списке.

#### `src/features/transactions/`

- **`api.ts`** — функции запросов к budget-api (named exports). `getTransactions()` — `GET /transactions` (требует JWT), возвращает массив транзакций. `createTransaction(input)` — `POST /transactions` (требует JWT), создаёт транзакцию; `userId` бэкенд берёт из JWT, `currency`/`date` проставляет дефолтами. `createTransactionFromVoice(blob, filename)` — `POST /transactions/voice` (multipart, поле `audio`, требует JWT): отправляет записанное аудио, бэкенд транскрибирует и парсит LLM, возвращает уже созданную транзакцию. `setTransactionCategory(id, categoryName)` — `PATCH /transactions/:id/category` (требует JWT): подтверждает категорию для pending-транзакции (бэк найдёт-или-создаст категорию по имени, гасит `autoConfirmAt`). Типы `Transaction` (поле `amount` — строка, т.к. Prisma `Decimal`; плюс `suggestedCategories: string[]` и `autoConfirmAt: string | null` для pending-категории; опц. `categoryPending` — приходит только в ответах voice/PATCH), `TransactionType` (`INCOME` | `EXPENSE`) и `CreateTransactionInput` (`amount`, `type`, опц. `description`, опц. `categoryId` — бэкенд проверит владение и привяжет категорию).
- **`keys.ts`** — `transactionKeys` (named export), реестр query-ключей TanStack Query. Централизует ключи кеша, чтобы чтение и инвалидации (после создания) использовали одни и те же значения.
- **`hooks.ts`** — `useTransactions`, `useCreateTransaction`, `useCreateTransactionFromVoice`, `useSetTransactionCategory` (named exports). `useTransactions` — чтение списка через `useQuery` под ключом `transactionKeys.all`. `useCreateTransaction` — мутация ручного создания. `useCreateTransactionFromVoice` — мутация голосового ввода (на вход `{ audio, filename }`). `useSetTransactionCategory` — мутация подтверждения категории (на вход `{ id, categoryName }`). Все мутации после успеха инвалидируют `transactionKeys.all`, чтобы лента сама перезапросилась.
- **`schema.ts`** — `createTransactionSchema` (zod) и тип `CreateTransactionFormValues` (named exports). Клиентская валидация формы создания; поля `amount`/`description`/`type` синхронны с `CreateTransactionDto` бэкенда (`amount` приводится из строки `<input>` через `z.coerce`). Категория задаётся одним из двух UI-полей: `categoryId` (id категории строкой — выбор радиокнопкой) либо `categoryInput` (название существующей/новой — ручной ввод); `superRefine` требует, чтобы было заполнено хотя бы одно. Готовый числовой `categoryId` собирает компонент.
- **`totals.ts`** — `monthlyExpenses(transactions)` и `topCategoryIds(transactions, limit=5)` (named exports), чистые функции. `monthlyExpenses` — сумма расходов (EXPENSE) за текущий календарный месяц. `topCategoryIds` — id категорий, отсортированные по частоте использования в переданных транзакциях (от самой частой), срез до `limit`.
- **`AddTransactionDialog.tsx`** — `AddTransactionDialog` (default export). Модальное окно ручного добавления транзакции: само хранит open-состояние и рендерит триггер «+». Форма на `react-hook-form` + `zodResolver` (`createTransactionSchema`); поля Сумма, Описание, Тип (Расход/Доход) и Категория (через `CategoryPicker`). Категории грузит через `useCategories`, частоты — через `useTransactions` + `topCategoryIds` (топ-частых для радиокнопок, fallback — первые из справочника); самая частая предвыбрана. Перед сохранением определяет `categoryId` (ручной ввод приоритетнее радиокнопки): по нормализованному имени ищет существующую, иначе создаёт через `useCreateCategory`. Сохраняет транзакцию через `useCreateTransaction`, передавая `categoryId`.
- **`CategoryPicker.tsx`** — `CategoryPicker` (default export). Controlled-поле выбора категории. Props: `frequent`/`categories` (`Category[]`), `categoryId`/`query` (текущий выбор) и `onChange`/`error`. Рендерит радиогруппу кнопок-чипов (топ-частых) и поле ручного ввода с кастомным дропдауном автодополнения по существующим категориям (фильтр по подстроке); если введённого имени нет — подсветка «будет создана новая категория». Радио и поле взаимоисключающи: выбор одного очищает другой.
- **`VoiceRecorderButton.tsx`** — `VoiceRecorderButton` (default export). Кнопка голосового ввода. Через `navigator.mediaDevices.getUserMedia` запрашивает микрофон, пишет звук браузерным `MediaRecorder` (подбирает поддерживаемый mime: `audio/webm;codecs=opus`, fallback `audio/mp4` для Safari) и по второму тапу отправляет blob через `useCreateTransactionFromVoice`. Авто-стоп через 60с — страховка от лимита 1 МБ на бэке. Сама показывает три состояния (idle/recording/«Распознаём…») и ошибки доступа к микрофону.
- **`CategoryPendingBadge.tsx`** — `CategoryPendingBadge` (default export, prop `transaction: Transaction`). Бейдж «Категория уточняется…» с обратным отсчётом до `autoConfirmAt` (тикает раз в 30с). По клику разворачивается панель: чипсы из `suggestedCategories` (тап = принять предложение) + поле «Своя категория». Сабмит через `useSetTransactionCategory` (бэк гасит `autoConfirmAt`, после инвалидации ленты бейдж исчезает сам). Также исчезает, если за это время сработал крон-автопод­тверждения на бэке.

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

- **`HomePage.tsx`** — `HomePage` (default export). Главная страница: через `useTransactions` грузит транзакции, считает расходы за месяц (`monthlyExpenses`) и выводит ленту с форматированием даты/валюты (`formatDate`, `formatCurrency`). Через `useCategories` сопоставляет `categoryId` транзакции с названием категории и показывает его рядом с датой. В шапке ленты — `VoiceRecorderButton` (голосовой ввод) и `AddTransactionDialog` (кнопка «+» для ручного ввода). У карточек транзакций с активным `autoConfirmAt` под основной строкой рендерится `CategoryPendingBadge`.
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
