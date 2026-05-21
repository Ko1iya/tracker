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
    ├── lib/
    │   ├── utils.ts           # Утилита cn() для склейки classNames (clsx + tailwind-merge)
    │   ├── auth.ts            # Хранение JWT-токена в localStorage: getToken/setToken/clearToken
    │   ├── api.ts             # axios-клиент к budget-api: baseURL из env, JWT-перехватчик, обработка 401
    │   └── queryClient.ts     # Глобальный QueryClient (TanStack Query) с дефолтными опциями кеша
    ├── components/
    │   ├── Layout.tsx         # Каркас авторизованных страниц: навигация + <Outlet />, стили на Tailwind
    │   └── ui/
    │       └── button.tsx     # Компонент Button (shadcn/ui): варианты и размеры через cva
    └── pages/
        ├── HomePage.tsx       # Главная: лента расходов и сводка за месяц (заглушка)
        ├── LoginPage.tsx      # Страница входа, рендерится вне Layout (заглушка)
        └── SettingsPage.tsx   # Страница настроек (заглушка)
```

### Описание файлов

#### Корень

- **`index.html`** — HTML-шаблон Vite. `<html lang="ru">`, `<title>Tracker — AI Budget App</title>`, контейнер `<div id="root">` и подключение модуля `/src/main.tsx`.
- **`vite.config.ts`** — конфиг Vite. Плагины: `@vitejs/plugin-react` (Fast Refresh + JSX-трансформация) и `@tailwindcss/vite` (компиляция Tailwind CSS v4).

#### `src/`

- **`main.tsx`** — точка входа. Берёт `#root`, создаёт React-корень через `createRoot` и рендерит `<App />` внутри `<StrictMode>`, обёрнутый в `QueryClientProvider` (TanStack Query) с клиентом из `lib/queryClient.ts`. Импортирует глобальный `index.css`.
- **`App.tsx`** — `App`, корневой компонент (default export). Настраивает роутинг через `BrowserRouter` / `Routes` (react-router-dom): `/login` — отдельно, `/` и `/settings` — внутри `Layout`. Несуществующие пути ведут на `HomePage`.
- **`index.css`** — глобальные стили. `@import 'tailwindcss'` подключает Tailwind v4 (preflight-сброс). Дальше — тема shadcn/ui: CSS-переменные дизайн-токенов (`--background`, `--primary` и т.д.) в `:root` и `.dark`, маппинг токенов в Tailwind через `@theme inline`, шрифт Inter (`@fontsource-variable/inter`), `@layer base` для базовых стилей `body`/`html`.
- **`vite-env.d.ts`** — декларации типов окружения Vite. Подключает `vite/client` и типизирует `import.meta.env.VITE_API_URL` (базовый URL `budget-api`).

#### `src/lib/`

- **`utils.ts`** — утилита `cn(...)` (named export): объединяет классы через `clsx` и снимает конфликты Tailwind через `tailwind-merge`. Используется всеми компонентами shadcn/ui.
- **`auth.ts`** — работа с JWT-токеном в `localStorage` (named exports `getToken`, `setToken`, `clearToken`). Токен budget-api выдаёт на `POST /auth/login`; он нужен в заголовке `Authorization: Bearer <token>` для защищённых эндпоинтов.
- **`api.ts`** — `api` (named export), настроенный axios-инстанс к `budget-api`. `baseURL` из `import.meta.env.VITE_API_URL`. Request-перехватчик подставляет JWT из `auth.ts` в заголовок `Authorization`; response-перехватчик при ответе `401` чистит токен и редиректит на `/login`.
- **`queryClient.ts`** — `queryClient` (named export), глобальный `QueryClient` (TanStack Query). Дефолтные опции: `staleTime` 60с, без рефетча по фокусу окна, один повтор при ошибке. Подключается в `main.tsx`.

#### `src/components/`

- **`Layout.tsx`** — `Layout` (default export). Общий каркас авторизованных страниц: шапка с `NavLink`-навигацией (Главная, Настройки, Выход) и `<Outlet />`, куда React Router подставляет текущую вложенную страницу. Стили — на utility-классах Tailwind.

#### `src/components/ui/` (shadcn/ui)

- **`button.tsx`** — `Button` (named export) и `buttonVariants`. Компонент кнопки shadcn/ui: варианты (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) и размеры через `class-variance-authority`. Поддерживает `asChild` (рендер как дочерний элемент через Radix `Slot`).

#### `src/pages/`

- **`HomePage.tsx`** — `HomePage` (default export). Главная страница: по плану лента расходов и сумма за месяц. Сейчас заглушка.
- **`LoginPage.tsx`** — `LoginPage` (default export). Страница входа, рендерится вне `Layout` (без навигации). По плану — форма авторизации и запрос к `POST /auth/login` в `budget-api`. Сейчас заглушка.
- **`SettingsPage.tsx`** — `SettingsPage` (default export). Страница настроек. Сейчас заглушка.

---

## Routes

Клиентский роутинг — `react-router-dom` (BrowserRouter), настроен в `App.tsx`.

| Path        | Страница/компонент | Описание                                        | Файл                       | Статус   |
| ----------- | ------------------ | ----------------------------------------------- | -------------------------- | -------- |
| `/`         | `HomePage`         | Лента расходов и сводка за месяц (внутри Layout) | `src/pages/HomePage.tsx`   | заглушка |
| `/settings` | `SettingsPage`     | Настройки (внутри Layout)                       | `src/pages/SettingsPage.tsx` | заглушка |
| `/login`    | `LoginPage`        | Вход, отдельно от Layout (без навигации)        | `src/pages/LoginPage.tsx`  | заглушка |
| `*`         | `HomePage`         | Фолбэк: любой неизвестный путь ведёт на главную  | `src/App.tsx`              | заглушка |
