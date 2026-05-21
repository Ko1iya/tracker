import { NavLink, Outlet } from "react-router-dom"
import { useLogout } from "@/features/auth/hooks"

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "font-semibold" : "opacity-70 hover:opacity-100"

// Чисто визуальный каркас авторизованных страниц: шапка с навигацией + <Outlet />.
// Проверку доступа делает ProtectedRoute выше по дереву роутов.
function Layout() {
  const logout = useLogout()

  return (
    <div className='flex min-h-svh flex-col'>
      <header className='flex items-center justify-between gap-4 border-b border-gray-500/30 px-5 py-3'>
        <span className='text-lg font-bold'>Tracker</span>
        <nav className='flex items-center gap-4'>
          <NavLink to='/' end className={linkClass}>
            Главная
          </NavLink>
          <NavLink to='/settings' className={linkClass}>
            Настройки
          </NavLink>
          <button
            type='button'
            onClick={logout}
            className='opacity-70 hover:opacity-100'
          >
            Выход
          </button>
        </nav>
      </header>
      <main className='flex-1 p-5'>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
