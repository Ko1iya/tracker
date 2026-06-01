import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLogout } from "@/features/auth/hooks"

// Страница «Профиль»: настройки приложения + выход из аккаунта.
// Выход переехал сюда из шапки Layout (на мобиле шапки с навигацией нет).
function SettingsPage() {
  const logout = useLogout()

  return (
    <section className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
      <h1 className='text-lg font-semibold'>Профиль</h1>
      <p className='text-muted-foreground'>
        Здесь появятся настройки профиля и приложения.
      </p>

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
