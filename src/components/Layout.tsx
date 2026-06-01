import { NavLink, Outlet } from "react-router-dom"
import BottomNav from "./BottomNav"

// Навигационные ссылки шапки скрыты на мобиле — там их роль играет BottomNav.
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `hidden sm:inline ${isActive ? "font-semibold" : "opacity-70 hover:opacity-100"}`

// Чисто визуальный каркас авторизованных страниц: шапка с навигацией + <Outlet />.
// На мобиле навигация и действия живут в BottomNav; выход — внутри Профиля.
// Проверку доступа делает ProtectedRoute выше по дереву роутов.
function Layout() {
  return (
    <div className='flex min-h-svh flex-col'>
      <header className='flex items-center justify-between gap-4 border-b border-gray-500/30 px-5 py-3'>
        <span className='text-lg font-bold'>Tracker</span>
        <nav className='flex items-center gap-4'>
          <NavLink to='/' end className={linkClass}>
            Главная
          </NavLink>
          <NavLink to='/settings' className={linkClass}>
            Профиль
          </NavLink>
        </nav>
      </header>
      <main className='flex-1 p-5 pb-24 sm:pb-5'>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default Layout
