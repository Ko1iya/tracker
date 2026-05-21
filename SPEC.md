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
    ├── main.tsx               # Точка входа: монтирует <App /> в #root через createRoot в StrictMode, импортирует index.css
    ├── App.tsx                # Корневой компонент: настраивает клиентский роутинг (BrowserRouter + Routes)
    ├── index.css              # Подключает Tailwind (@import) + базовые :root-настройки шрифта и color-scheme
    ├── components/
    │   └── Layout.tsx         # Каркас авторизованных страниц: навигация + <Outlet />, стили на Tailwind
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

- **`main.tsx`** — точка входа. Берёт `#root`, создаёт React-корень через `createRoot` и рендерит `<App />` внутри `<StrictMode>`. Импортирует глобальный `index.css`.
- **`App.tsx`** — `App`, корневой компонент (default export). Настраивает роутинг через `BrowserRouter` / `Routes` (react-router-dom): `/login` — отдельно, `/` и `/settings` — внутри `Layout`. Несуществующие пути ведут на `HomePage`.
- **`index.css`** — глобальные стили. `@import 'tailwindcss'` подключает Tailwind v4 (включая preflight-сброс). Плюс базовые `:root`-настройки: системный `font-family`, `line-height`, `color-scheme: light dark`.

#### `src/components/`

- **`Layout.tsx`** — `Layout` (default export). Общий каркас авторизованных страниц: шапка с `NavLink`-навигацией (Главная, Настройки, Выход) и `<Outlet />`, куда React Router подставляет текущую вложенную страницу. Стили — на utility-классах Tailwind.

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
