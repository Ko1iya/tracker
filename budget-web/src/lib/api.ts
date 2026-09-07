import axios from "axios"
import { clearToken, getToken } from "./token"

// Единый axios-клиент для запросов к budget-api (NestJS).
// baseURL берётся из .env (VITE_API_URL = /api);
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Request-перехватчик: перед каждым запросом подкладываем JWT в заголовок
// Authorization, если токен есть в localStorage. Так защищённые эндпоинты
// budget-api (закрытые Guard'ом) пропустят запрос.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response-перехватчик: если бэкенд ответил 401 (токен протух или отсутствует),
// чистим токен и отправляем пользователя на страницу входа. Редирект через
// window.location, т.к. перехватчик живёт вне дерева React Router.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      if (window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  },
)
