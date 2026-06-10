import { Link } from "react-router-dom"
import { ChevronRight, LogOut, Monitor, Moon, Sun, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLogout } from "@/features/auth/hooks"
import { useTheme } from "@/features/theme/useTheme"
import type { Theme } from "@/features/theme/theme"
import { cn } from "@/lib/utils"

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Светлая", icon: Sun },
  { value: "dark", label: "Тёмная", icon: Moon },
  { value: "system", label: "Системная", icon: Monitor },
]

// Страница «Профиль»: настройки приложения + выход из аккаунта.
// Выход переехал сюда из шапки Layout (на мобиле шапки с навигацией нет).
function SettingsPage() {
  const logout = useLogout()
  const { theme, setTheme } = useTheme()

  return (
    <section className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
      <h1 className='text-lg font-semibold'>Профиль</h1>

      {/* Оформление: сегментированный переключатель темы */}
      <div className='rounded-xl border bg-card p-4 shadow-sm'>
        <p className='mb-3 text-sm font-medium'>Оформление</p>
        <div className='grid grid-cols-3 gap-1 rounded-lg bg-muted p-1'>
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const active = theme === opt.value
            return (
              <button
                key={opt.value}
                type='button'
                onClick={() => setTheme(opt.value)}
                aria-pressed={active}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className='h-4 w-4' />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Список настроек: пока единственный пункт — управление категориями */}
      <ul className='flex flex-col divide-y rounded-xl border bg-card shadow-sm'>
        <li>
          <Link
            to='/categories'
            className='flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent'
          >
            <span className='flex items-center gap-2 text-sm'>
              <Tags className='h-4 w-4 text-muted-foreground' />
              Категории
            </span>
            <ChevronRight className='h-4 w-4 text-muted-foreground' />
          </Link>
        </li>
      </ul>

      <Button
        type='button'
        variant='outline'
        onClick={logout}
        className='self-start'
      >
        <LogOut />
        Выйти из аккаунта
      </Button>
    </section>
  )
}

export default SettingsPage
