// Управление цветовой темой приложения: светлая / тёмная / системная.
// Тема хранится в localStorage и применяется классом .dark на <html>;
// CSS-переменные для .dark описаны в index.css.

export type Theme = "light" | "dark" | "system"

export const THEME_STORAGE_KEY = "tracker-theme"

// "system" = следовать за настройкой ОС. resolveTheme превращает её в
// конкретную светлую/тёмную по системному предпочтению (prefers-color-scheme).
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  }
  return theme
}

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system"
}

// Ставит/снимает класс .dark на <html> по итоговой теме.
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark")
}
