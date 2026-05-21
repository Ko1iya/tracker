import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import HomePage from "./pages/HomePage"
import LoginPage from "./pages/LoginPage"
import SettingsPage from "./pages/SettingsPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/login' element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path='/' element={<HomePage />} />
          <Route path='/settings' element={<SettingsPage />} />
        </Route>
        <Route path='*' element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
