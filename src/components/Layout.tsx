import { NavLink, Outlet } from 'react-router-dom'

// Общий каркас для авторизованных страниц: верхняя навигация + область контента.
// <Outlet /> — место, куда React Router подставляет текущую вложенную страницу.
// Стили — на utility-классах Tailwind.
const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-semibold' : 'opacity-70 hover:opacity-100'

function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-gray-500/30 px-5 py-3">
        <span className="text-lg font-bold">Tracker</span>
        <nav className="flex gap-4">
          <NavLink to="/" end className={linkClass}>
            Главная
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            Настройки
          </NavLink>
          <NavLink to="/login" className={linkClass}>
            Выход
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 p-5">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
