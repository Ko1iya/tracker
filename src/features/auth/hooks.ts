import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { clearToken, setToken } from "@/lib/token"
import { login } from "./api"
import type { LoginFormValues } from "./schema"

// useLogin инкапсулирует всю логику входа: запрос к API, сохранение JWT
// и переход на главную. Компонент-форма получает только mutate/isPending/error
// и не знает деталей про токены и навигацию.
export function useLogin() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (values: LoginFormValues) =>
      login(values.email, values.password),
    onSuccess: (data) => {
      setToken(data.accessToken)
      navigate("/")
    },
  })
}

// useLogout — обратное действие: чистим токен и уходим на страницу входа.
// Сетевого запроса нет (JWT stateless, бэкенду «разлогин» сообщать нечем),
// поэтому это не мутация, а простой колбэк.
export function useLogout() {
  const navigate = useNavigate()

  return () => {
    clearToken()
    navigate("/login")
  }
}
