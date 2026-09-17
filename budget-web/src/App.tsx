import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import ProtectedRoute from "./components/ProtectedRoute"
import AccountsPage from "./pages/AccountsPage"
import CategoriesPage from "./pages/CategoriesPage"
import HomePage from "./pages/HomePage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import SettingsPage from "./pages/SettingsPage"
import TransactionDetailPage from "./pages/TransactionDetailPage"
import { Toaster } from "./components/ui/sonner"

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
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
            <Route path='/accounts' element={<AccountsPage />} />
            {/* Фолбэк внутри закрытой зоны: неизвестный путь ведёт на главную */}
            <Route path='*' element={<HomePage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
