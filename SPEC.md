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
    │   │   ├── api.ts         # getCategories(), createCategory(), deleteCategory(), normalizeCategoryTitle(); тип Category (+transactionCount)
    │   │   ├── keys.ts        # Реестр query-ключей TanStack Query (categoryKeys)
    │   │   └── hooks.ts       # useCategories (чтение), useCreateCategory (optimistic), useDeleteCategory
    │   ├── transactions/
    │   │   ├── api.ts         # getTransactions(), createTransaction(), createTransactionFromVoice(), setTransactionCategory(); типы Transaction, TransactionType, CreateTransactionInput
    │   │   ├── keys.ts        # Реестр query-ключей TanStack Query (transactionKeys)
    │   │   ├── hooks.ts       # useTransactions, useCreateTransaction, useCreateTransactionFromVoice, useSetTransactionCategory (все мутации инвалидируют кеш ленты)
    │   │   ├── schema.ts      # zod-схема формы создания createTransactionSchema + тип CreateTransactionFormValues
    │   │   ├── totals.ts      # monthlyExpenses (расходы за месяц), topCategoryIds (частые категории) — чистые функции
    │   │   ├── AddTransactionDialog.tsx # Модалка ручного добавления транзакции (форма + триггер «+»)
    │   │   ├── CategoryPicker.tsx       # Поле выбора категории: радиокнопки топ-частых + ручной ввод с автодополнением
    │   │   ├── VoiceRecorderButton.tsx  # Кнопка голосового ввода: MediaRecorder → POST /transactions/voice
    │   │   └── CategoryConfirmPanel.tsx # Блок подтверждения pending-категории на странице детали (suggestedCategories / своя)
    │   └── theme/
    │       ├── theme.ts       # Логика темы: тип Theme, чтение/применение (класс .dark на <html>), localStorage
    │       └── useTheme.ts    # Хук useTheme: текущая тема + setTheme, слежение за системной темой
    ├── components/
    │   ├── Layout.tsx         # Визуальный каркас авторизованных страниц: шапка (десктоп) + <Outlet /> + BottomNav (мобайл)
    │   ├── BottomNav.tsx      # Нижняя панель мобильной версии: слева Профиль, справа три способа добавить расход (вручную · голос · фото)
    │   ├── ProtectedRoute.tsx # Гард доступа: без JWT редиректит на /login
    │   └── ui/
    │       ├── button.tsx     # Компонент Button (shadcn/ui): варианты и размеры через cva
    │       ├── input.tsx      # Компонент Input (shadcn/ui): стилизованное текстовое поле
    │       ├── label.tsx      # Компонент Label (shadcn/ui): подпись к полю формы
    │       ├── dialog.tsx     # Модальное окно (shadcn/ui, Radix Dialog): набор Dialog*-частей
    │       ├── select.tsx     # Выпадающий список (shadcn/ui, Radix Select): набор Select*-частей
    │       └── sonner.tsx     # Toaster (sonner): всплывающие тосты, монтируется в App
    └── pages/
        ├── HomePage.tsx       # Главная: лента расходов и сводка за месяц
        ├── TransactionDetailPage.tsx # Детали одной траты: инфо, подтверждение категории, правка, удаление
        ├── CategoriesPage.tsx # Управление категориями: добавление, счётчик использования, удаление с undo
        ├── LoginPage.tsx      # Страница входа (форма на react-hook-form + zod), вне Layout
        └── SettingsPage.tsx   # Страница «Профиль»: ссылка на категории + кнопка выхода
```

### Описание файлов

#### Корень

- **`index.html`** — HTML-шаблон Vite. `<html lang="ru">`, `<title>Tracker — AI Budget App</title>`, контейнер `<div id="root">` и подключение модуля `/src/main.tsx`. В `<head>` — небольшой inline-скрипт, который до загрузки React читает сохранённую тему из `localStorage` (ключ `tracker-theme`) и ставит класс `.dark` на `<html>`, чтобы при тёмной теме не мелькала светлая (anti-FOUC). Дублирует логику `features/theme`.
- **`vite.config.ts`** — конфиг Vite. Плагины: `@vitejs/plugin-react` (Fast Refresh + JSX-трансформация) и `@tailwindcss/vite` (компиляция Tailwind CSS v4). `server.host: true` — dev-сервер слушает на всех сетевых интерфейсах (доступ с телефона по IP). `server.proxy` — запросы на `/api` проксируются на budget-api (`http://localhost:3000`) с отрезанием префикса `/api`; так фронт и API для браузера остаются одним origin (CORS не задействуется).

#### `src/`

- **`main.tsx`** — точка входа. Берёт `#root`, создаёт React-корень через `createRoot` и рендерит `<App />` внутри `<StrictMode>`, обёрнутый в `QueryClientProvider` (TanStack Query) с клиентом из `lib/queryClient.ts`. Импортирует глобальный `index.css`.
- **`App.tsx`** — `App`, корневой компонент (default export). Настраивает роутинг через `BrowserRouter` / `Routes` (react-router-dom): `/login` — отдельно; закрытая зона (`/`, `/transactions/:id`, `/settings`, `/categories` и фолбэк `*`) обёрнута в `ProtectedRoute` (гард доступа), внутри — `Layout` (визуальный каркас). Здесь же монтируется глобальный `<Toaster />` (sonner) для всплывающих уведомлений.
- **`index.css`** — глобальные стили. `@import 'tailwindcss'` подключает Tailwind v4 (preflight-сброс). Дальше — тема shadcn/ui: CSS-переменные дизайн-токенов (`--background`, `--primary` и т.д.) в `:root` и `.dark`, маппинг токенов в Tailwind через `@theme inline`, шрифт Inter (`@fontsource-variable/inter`), `@layer base` для базовых стилей `body`/`html`.
- **`vite-env.d.ts`** — декларации типов окружения Vite. Подключает `vite/client` и типизирует `import.meta.env.VITE_API_URL` (базовый URL `budget-api`).

#### `src/lib/` (инфраструктура, не зависит от фич)

- **`utils.ts`** — утилита `cn(...)` (named export): объединяет классы через `clsx` и снимает конфликты Tailwind через `tailwind-merge`. Используется всеми компонентами shadcn/ui.
- **`token.ts`** — низкоуровневое хранилище JWT-токена в `localStorage` (named exports `getToken`, `setToken`, `clearToken`). Токен budget-api выдаёт на `POST /auth/login`; он нужен в заголовке `Authorization: Bearer <token>` для защищённых эндпоинтов. Слой `lib` не знает про фичу `auth` — наоборот, фича и axios-клиент пользуются этими функциями.
- **`api.ts`** — `api` (named export), настроенный axios-инстанс к `budget-api`. `baseURL` из `import.meta.env.VITE_API_URL` (= `/api`, проксируется dev-сервером Vite на бэкенд). Request-перехватчик подставляет JWT из `token.ts` в заголовок `Authorization`; response-перехватчик при ответе `401` чистит токен и редиректит на `/login`.
- **`queryClient.ts`** — `queryClient` (named export), глобальный `QueryClient` (TanStack Query). Дефолтные опции: `staleTime` 60с, без рефетча по фокусу окна, один повтор при ошибке. Подключается в `main.tsx`.
- **`format.ts`** — форматирование через встроенный `Intl` (named exports `formatCurrency`, `formatDate`, `formatDateTime`). `formatCurrency(amount, currency)` — деньги в локали `ru-RU` (кеширует `Intl.NumberFormat` по валюте); `formatDate(date)` — дата вида «5 мая»; `formatDateTime(date)` — полная дата со временем вида «5 мая 2026 г., 14:30» (для страницы детали). `amount` принимается строкой/числом (с бэкенда приходит строкой из-за Prisma `Decimal`).

#### `src/features/auth/`

- **`api.ts`** — `login(email, password)` (named export): `POST /auth/login` в budget-api, возвращает `{ accessToken, user }`. Типы `AuthUser`, `AuthResponse`. При неверных данных бэкенд отвечает 401.
- **`schema.ts`** — `loginSchema` (zod) и выводимый из неё тип `LoginFormValues` (named exports). Клиентская валидация формы входа; поля синхронны с `LoginDto` бэкенда (email, password).
- **`hooks.ts`** — `useLogin` и `useLogout` (named exports). `useLogin` — мутация TanStack Query: вызывает `login()`, при успехе сохраняет JWT (`setToken`) и уходит на `/`. `useLogout` — колбэк: чистит токен и уходит на `/login` (сетевого запроса нет, JWT stateless).

#### `src/features/categories/`

- **`api.ts`** — функции запросов к budget-api (named exports). `getCategories()` — `GET /categories` (требует JWT), возвращает массив категорий пользователя (каждая со счётчиком `transactionCount` — бэк считает через `_count`). `createCategory(title)` — `POST /categories` (требует JWT): создаёт категорию по названию; бэкенд нормализует `title` и при дубликате (`userId+title`) отвечает 409. `deleteCategory(id)` — `DELETE /categories/:id` (требует JWT): удаляет категорию; бэкенд запрещает удаление используемой (при `transactionCount > 0` отвечает 409, чужая/несуществующая — 404, успех — 204). `normalizeCategoryTitle(raw)` — фронтовая копия серверной нормализации (trim + первая буква в верхний регистр), чтобы до запроса найти уже существующую категорию и не ловить лишний 409. Тип `Category` (`id`, `title`, `userId`, `transactionCount`).
- **`keys.ts`** — `categoryKeys` (named export), реестр query-ключей TanStack Query для категорий. Чтение и инвалидация (после создания/удаления) используют один ключ.
- **`hooks.ts`** — `useCategories`, `useCreateCategory`, `useDeleteCategory` (named exports). `useCategories` — чтение списка через `useQuery` под ключом `categoryKeys.all`. `useCreateCategory` — мутация создания с оптимистичным добавлением в кеш (временная запись с отрицательным id, при ошибке откат, в `onSettled` инвалидация). `useDeleteCategory` — мутация удаления; в `onSettled` инвалидирует `categoryKeys.all` (при успехе подтянет актуальный список, при 409 вернёт строку). Оптимистичное скрытие на время undo-окна делает сам экран `CategoriesPage`.

#### `src/features/transactions/`

- **`api.ts`** — функции запросов к budget-api (named exports). `getTransactions()` — `GET /transactions` (требует JWT), возвращает массив транзакций. `getTransaction(id)` — `GET /transactions/:id` (требует JWT), одна транзакция; 404 при отсутствии/чужой. `createTransaction(input)` — `POST /transactions` (требует JWT), создаёт транзакцию; `userId` бэкенд берёт из JWT, `currency`/`date` проставляет дефолтами. `updateTransaction(id, input)` — `PATCH /transactions/:id` (требует JWT), правит транзакцию (переданное подмножество полей). `deleteTransaction(id)` — `DELETE /transactions/:id` (требует JWT), возвращает `{ id }`. `createTransactionFromVoice(blob, filename)` — `POST /transactions/voice` (multipart, поле `audio`, требует JWT): отправляет записанное аудио, бэкенд транскрибирует и парсит LLM, возвращает уже созданную транзакцию. `setTransactionCategory(id, categoryName)` — `PATCH /transactions/:id/category` (требует JWT): подтверждает категорию для pending-транзакции (бэк найдёт-или-создаст категорию по имени, гасит `autoConfirmAt`). Типы `Transaction` (поле `amount` — строка, т.к. Prisma `Decimal`; плюс `suggestedCategories: string[]` и `autoConfirmAt: string | null` для pending-категории; опц. `categoryPending` — приходит только в ответах voice/PATCH), `TransactionType` (`INCOME` | `EXPENSE`), `CreateTransactionInput` (`amount`, `type`, опц. `description`, опц. `categoryId` — бэкенд проверит владение и привяжет категорию) и `UpdateTransactionInput` (= `Partial<CreateTransactionInput>`).
- **`keys.ts`** — `transactionKeys` (named export), реестр query-ключей TanStack Query. `all` (`["transactions"]`) — список; `detail(id)` (`["transactions", id]`) — одна транзакция. Префикс детали совпадает с `all`, поэтому инвалидация `all` автоматически освежает и кеши детальных страниц.
- **`hooks.ts`** — `useTransactions`, `useTransaction`, `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction`, `useCreateTransactionFromVoice`, `useSetTransactionCategory` (named exports). `useTransactions` — чтение списка под ключом `transactionKeys.all`. `useTransaction(id)` — чтение одной транзакции под `transactionKeys.detail(id)` (для страницы детали при прямом переходе/обновлении). `useCreateTransaction` — мутация создания. `useUpdateTransaction` — мутация правки (на вход `{ id, input }`). `useDeleteTransaction` — мутация удаления (на вход `id`). `useCreateTransactionFromVoice` — мутация голосового ввода (`{ audio, filename }`). `useSetTransactionCategory` — мутация подтверждения категории (`{ id, categoryName }`). Все мутации после успеха инвалидируют `transactionKeys.all` (благодаря общему префиксу освежается и лента, и детали).
- **`schema.ts`** — `createTransactionSchema` (zod) и тип `CreateTransactionFormValues` (named exports). Клиентская валидация формы создания; поля `amount`/`description`/`type` синхронны с `CreateTransactionDto` бэкенда (`amount` приводится из строки `<input>` через `z.coerce`). Категория задаётся одним из двух UI-полей: `categoryId` (id категории строкой — выбор радиокнопкой) либо `categoryInput` (название существующей/новой — ручной ввод); `superRefine` требует, чтобы было заполнено хотя бы одно. Готовый числовой `categoryId` собирает компонент.
- **`totals.ts`** — `monthlyExpenses(transactions)` и `topCategoryIds(transactions, limit=5)` (named exports), чистые функции. `monthlyExpenses` — сумма расходов (EXPENSE) за текущий календарный месяц. `topCategoryIds` — id категорий, отсортированные по частоте использования в переданных транзакциях (от самой частой), срез до `limit`.
- **`AddTransactionDialog.tsx`** — `AddTransactionDialog` (default export, опц. пропы `trigger?: ReactNode`, `transaction?: Transaction`). Модальное окно добавления/правки транзакции: само хранит open-состояние. `trigger` заменяет элемент-триггер (например, круглая кнопка `BottomNav`); по умолчанию — кнопка «Добавить». Если передана `transaction` — режим правки: при открытии форма заполняется её значениями, заголовок «Редактировать транзакцию», сохранение шлёт `PATCH` через `useUpdateTransaction` (иначе `POST` через `useCreateTransaction`). Форма на `react-hook-form` + `zodResolver` (`createTransactionSchema`); поля Сумма, Описание, Тип (Расход/Доход) и Категория (через `CategoryPicker`). Категории грузит через `useCategories`, частоты — через `useTransactions` + `topCategoryIds` (мемоизированные топ-частых для радиокнопок, fallback — первые из справочника; в режиме правки текущая категория траты гарантированно добавлена в чипсы). В создании самая частая предвыбрана. Перед сохранением определяет `categoryId` (ручной ввод приоритетнее радиокнопки): по нормализованному имени ищет существующую, иначе создаёт через `useCreateCategory`.
- **`CategoryPicker.tsx`** — `CategoryPicker` (default export). Controlled-поле выбора категории. Props: `frequent`/`categories` (`Category[]`), `categoryId`/`query` (текущий выбор) и `onChange`/`error`. Рендерит радиогруппу кнопок-чипов (топ-частых) и поле ручного ввода с кастомным дропдауном автодополнения по существующим категориям (фильтр по подстроке); если введённого имени нет — подсветка «будет создана новая категория». Радио и поле взаимоисключающи: выбор одного очищает другой.
- **`VoiceRecorderButton.tsx`** — `VoiceRecorderButton` (default export, опц. пропы `fab?: boolean`, `className?: string`). Кнопка голосового ввода. Через `navigator.mediaDevices.getUserMedia` запрашивает микрофон, пишет звук браузерным `MediaRecorder` (подбирает поддерживаемый mime: `audio/webm;codecs=opus`, fallback `audio/mp4` для Safari) и по второму тапу отправляет blob через `useCreateTransactionFromVoice`. Авто-стоп через 60с — страховка от лимита 1 МБ на бэке. Сама показывает три состояния (idle/recording/«Распознаём…»); ошибки доступа к микрофону и сбой распознавания — всплывающим тостом (sonner). `fab` — круглый icon-only вид для `BottomNav` (стиль круга задаёт `className`); без него — обычная кнопка с текстом.
- **`CategoryConfirmPanel.tsx`** — `CategoryConfirmPanel` (default export, prop `transaction: Transaction`). Заметный блок подтверждения pending-категории на странице детали транзакции: обратный отсчёт до `autoConfirmAt` (тикает раз в 30с) в виде пилюли, пояснение, чипсы из `suggestedCategories` (тап = принять предложение) + поле «Своя категория». Сабмит через `useSetTransactionCategory` (бэк гасит `autoConfirmAt`, после инвалидации кеша блок исчезает сам). Также исчезает, если за это время сработал крон-автопод­тверждения на бэке.

#### `src/features/theme/`

- **`theme.ts`** — логика цветовой темы (named exports `Theme`, `THEME_STORAGE_KEY`, `getStoredTheme`, `resolveTheme`, `applyTheme`). `Theme` = `"light" | "dark" | "system"`. Тема хранится в `localStorage` под ключом `tracker-theme`; `resolveTheme` превращает `"system"` в конкретную светлую/тёмную через `window.matchMedia("(prefers-color-scheme: dark)")`; `applyTheme` ставит/снимает класс `.dark` на `<html>` (CSS-переменные `.dark` живут в `index.css`).
- **`useTheme.ts`** — `useTheme` (named export). React-хук: возвращает текущую тему и `setTheme` (пишет в `localStorage`, применяет класс, обновляет состояние). Пока выбран режим `"system"`, подписывается на изменение системной темы (`matchMedia`) и переключает оформление на лету.

#### `src/components/`

- **`Layout.tsx`** — `Layout` (default export). Визуальный каркас авторизованных страниц: шапка с брендом и навигационными `NavLink` (Главная, Профиль), видимыми только на десктопе (`hidden sm:inline`). `<Outlet />` под вложенные страницы, снизу — `BottomNav` (мобильная навигация + действия). Выход вынесен на страницу «Профиль». Стили — Tailwind. Проверку доступа делает `ProtectedRoute` выше по дереву.
- **`BottomNav.tsx`** — `BottomNav` (default export). Фиксированная у нижнего края панель мобильной версии (`sm:hidden`). Слева — круглая кнопка `NavLink` «Профиль» (`/settings`; активный маршрут подсвечивается акцентом). Справа — ряд из трёх круглых кнопок единого стиля для добавления расхода: «Вручную» (`trigger` для `AddTransactionDialog`), «Голос» (`VoiceRecorderButton` в режиме `fab`) и «Фото» (распознавание чека — задел, кнопка `disabled`). Учитывает `safe-area-inset-bottom`.
- **`ProtectedRoute.tsx`** — `ProtectedRoute` (default export). Гард доступа: при отсутствии JWT-токена редиректит на `/login` (`<Navigate replace />`), иначе рендерит `<Outlet />`. Отделён от `Layout`, чтобы доступ и вёрстка были разными ответственностями.

#### `src/components/ui/` (shadcn/ui)

- **`button.tsx`** — `Button` (named export) и `buttonVariants`. Компонент кнопки shadcn/ui: варианты (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) и размеры через `class-variance-authority`. Поддерживает `asChild` (рендер как дочерний элемент через Radix `Slot`).
- **`input.tsx`** — `Input` (named export). Стилизованное текстовое поле shadcn/ui (обёртка над `<input>` с классами темы). Используется в формах, например на странице входа.
- **`label.tsx`** — `Label` (named export). Подпись к полю формы (обёртка над Radix `Label`). Используется в форме добавления транзакции.
- **`dialog.tsx`** — модальное окно shadcn/ui поверх Radix `Dialog` (named exports `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `DialogClose`, `DialogDescription`, `DialogOverlay`, `DialogPortal`). Используется в `AddTransactionDialog`.
- **`select.tsx`** — выпадающий список shadcn/ui поверх Radix `Select` (named exports `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator` и др.). Используется для полей Тип и Категория в `AddTransactionDialog`.
- **`sonner.tsx`** — `Toaster` (named export), тонкая обёртка над `Toaster` из `sonner` с дефолтами проекта (позиция сверху по центру, `richColors`, длительность 5с). Монтируется один раз в `App`; уведомления вызываются из любого места через `toast.error(...)` и т.п.

#### `src/pages/`

- **`HomePage.tsx`** — `HomePage` (default export). Главная страница: через `useTransactions` грузит транзакции, считает расходы за месяц (`monthlyExpenses`) и выводит ленту с форматированием даты/валюты (`formatDate`, `formatCurrency`). Через `useCategories` сопоставляет `categoryId` транзакции с названием категории и показывает его рядом с датой. Каждая трата — `Link` на `/transactions/:id` (страница детали), где можно подтвердить категорию, отредактировать и удалить; у трат с активным `autoConfirmAt` в строке показывается некликабельный бейдж-подсказка «Уточнить категорию». В шапке ленты (только на десктопе, `hidden sm:flex`) — `VoiceRecorderButton` (голосовой ввод) и `AddTransactionDialog` (ручной ввод); на мобиле эти действия живут в `BottomNav`.
- **`TransactionDetailPage.tsx`** — `TransactionDetailPage` (default export). Страница детали одной траты (маршрут `/transactions/:id`). Берёт `id` из `useParams`, грузит транзакцию через `useTransaction` (404/невалидный id → «Транзакция не найдена»). Показывает: шапку с крупной суммой (знак/цвет по типу) и описанием; заметный блок подтверждения категории `CategoryConfirmPanel` (если активен `autoConfirmAt`); список подробностей (дата со временем через `formatDateTime`, категория из `useCategories`, тип, валюта). Действия: «Редактировать» — `AddTransactionDialog` в режиме правки (prop `transaction`); «Удалить» — через `useDeleteTransaction` с подтверждением `window.confirm`, по успеху тост (sonner) и возврат на `/`.
- **`CategoriesPage.tsx`** — `CategoriesPage` (default export, маршрут `/categories`). Экран управления категориями. Список грузит через `useCategories`. Поле сверху + `useCreateCategory` добавляют категорию (чип появляется мгновенно благодаря optimistic-обновлению; дубликат не шлётся на бэк, а подсвечивает существующую строку). Каждая строка — название, бейдж со счётчиком `transactionCount` и крестик удаления. Удалять можно только пустые категории (у используемых крестик `disabled` с подсказкой — бэк всё равно ответит 409). Удаление с отменой: строка прячется локально, тост (sonner) с кнопкой «Отменить» висит 5с, и только по истечении окна вызывается `useDeleteCategory` (`DELETE`); уход со страницы во время окна отменяет удаление.
- **`LoginPage.tsx`** — `LoginPage` (default export). Страница входа вне `Layout`. Форма на `react-hook-form` + `zodResolver` (валидация по `loginSchema`); вход через хук `useLogin`. Показывает ошибки валидации полей и серверную ошибку при 401/недоступном бэкенде.
- **`SettingsPage.tsx`** — `SettingsPage` (default export). Страница «Профиль»: блок «Оформление» с сегментированным переключателем темы (Светлая / Тёмная / Системная) через `useTheme`; список настроек со ссылкой на `/categories` (управление категориями); кнопка «Выйти из аккаунта» (через `useLogout`). Выход перенесён сюда из шапки `Layout` — на мобиле в шапке навигации нет.

---

## Routes

Клиентский роутинг — `react-router-dom` (BrowserRouter), настроен в `App.tsx`.

| Path        | Страница/компонент | Описание                                        | Файл                       | Статус   |
| ----------- | ------------------ | ----------------------------------------------- | -------------------------- | -------- |
| `/`         | `HomePage`         | Лента расходов и сводка за месяц (внутри Layout, требует авторизации) | `src/pages/HomePage.tsx`   | готово   |
| `/transactions/:id` | `TransactionDetailPage` | Детали траты: инфо, подтверждение категории, правка, удаление (внутри Layout, требует авторизации) | `src/pages/TransactionDetailPage.tsx` | готово |
| `/settings` | `SettingsPage`     | Профиль: выбор темы, ссылка на категории + выход (внутри Layout, требует авторизации) | `src/pages/SettingsPage.tsx` | частично |
| `/categories` | `CategoriesPage` | Управление категориями: добавление, счётчик, удаление с undo (внутри Layout, требует авторизации) | `src/pages/CategoriesPage.tsx` | готово |
| `/login`    | `LoginPage`        | Вход, отдельно от Layout (без навигации)        | `src/pages/LoginPage.tsx`  | готово   |
| `*`         | `HomePage`         | Фолбэк внутри закрытой зоны: неизвестный путь ведёт на главную (без токена — на `/login`) | `src/App.tsx`              | готово   |
