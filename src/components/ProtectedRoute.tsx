import { Navigate, Outlet } from "react-router-dom"
import { getToken } from "@/lib/token"

// Гард авторизованных маршрутов. Без JWT-токена сразу уводим на /login,
// не показывая защищённый контент. replace — чтобы закрытый путь не оставался
// в истории браузера (кнопка «назад» не вернёт на него после разлогина).
// Отделён от Layout: Layout отвечает только за визуальный каркас, а доступ —
// это самостоятельная ответственность роутинга.
function ProtectedRoute() {
  if (!getToken()) {
    return <Navigate to='/login' replace />
  }
  return <Outlet />
}

export default ProtectedRoute
