import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import ProtectedRoute from "./components/ProtectedRoute"
import CategoriesPage from "./pages/CategoriesPage"
import HomePage from "./pages/HomePage"
import LoginPage from "./pages/LoginPage"
import SettingsPage from "./pages/SettingsPage"
import TransactionDetailPage from "./pages/TransactionDetailPage"
import { Toaster } from "./components/ui/sonner"

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path='/login' element={<LoginPage />} />
        {/* Закрытая зона: сначала гард ProtectedRoute, внутри — визуальный Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path='/' element={<HomePage />} />
            <Route
              path='/transactions/:id'
              element={<TransactionDetailPage />}
            />
            <Route path='/settings' element={<SettingsPage />} />
            <Route path='/categories' element={<CategoriesPage />} />
            {/* Фолбэк внутри закрытой зоны: неизвестный путь ведёт на главную */}
            <Route path='*' element={<HomePage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
