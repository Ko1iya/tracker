# SPEC

Живая спецификация структуры проекта `budget-web`. Поддерживается автоматически: каждое изменение кода в `src/`, `index.html` или `vite.config.ts` сопровождается обновлением этого файла.

Правила ведения — в `CLAUDE.md`.

---

## Project Structure

```
budget-web/
├── index.html                 # HTML-шаблон Vite: lang="ru", контейнер #root, подключает /src/main.tsx
├── vite.config.ts             # Конфиг Vite: подключён плагин @vitejs/plugin-react
└── src/
    ├── main.tsx               # Точка входа: монтирует <App /> в #root через createRoot в StrictMode, импортирует index.css
    ├── App.tsx                # Корневой компонент. Пока экран-заглушка "Tracker / AI Budget App"
    ├── index.css              # Глобальные стили: базовый сброс (box-sizing, body margin), системный шрифт, color-scheme
    └── App.css                # Стили компонента App: центрирование экрана-заглушки по центру вьюпорта
```

### Описание файлов

#### Корень

- **`index.html`** — HTML-шаблон Vite. `<html lang="ru">`, `<title>Tracker — AI Budget App</title>`, контейнер `<div id="root">` и подключение модуля `/src/main.tsx`.
- **`vite.config.ts`** — конфиг Vite. Единственный плагин — `@vitejs/plugin-react` (Fast Refresh + JSX-трансформация).

#### `src/`

- **`main.tsx`** — точка входа. Берёт `#root`, создаёт React-корень через `createRoot` и рендерит `<App />` внутри `<StrictMode>`. Импортирует глобальный `index.css`.
- **`App.tsx`** — `App`, корневой компонент приложения (default export). Сейчас рендерит экран-заглушку с названием проекта. Сюда позже встанет роутер.
- **`index.css`** — глобальные стили: системный `font-family`, `line-height`, `color-scheme: light dark`, базовый сброс (`box-sizing: border-box` на всё, `margin: 0` у `body`).
- **`App.css`** — стили компонента `App`: flex-центрирование контента по центру экрана (`min-height: 100svh`).

---

## Routes

Клиентский роутинг (React Router) пока не настроен — приложение рендерит единственный экран-заглушку `App`. По плану (Этап 2) появятся страницы Login, Home, Settings; таблица маршрутов будет заполнена при подключении роутера.
