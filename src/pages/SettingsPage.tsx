import { Link } from "react-router-dom"
import { ChevronRight, LogOut, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLogout } from "@/features/auth/hooks"

// Страница «Профиль»: настройки приложения + выход из аккаунта.
// Выход переехал сюда из шапки Layout (на мобиле шапки с навигацией нет).
function SettingsPage() {
  const logout = useLogout()

  return (
    <section className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
      <h1 className='text-lg font-semibold'>Профиль</h1>

      {/* Список настроек: пока единственный пункт — управление категориями */}
      <ul className='flex flex-col divide-y divide-gray-500/15 rounded-lg border border-gray-500/30'>
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
