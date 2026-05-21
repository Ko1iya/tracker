import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLogin } from "@/features/auth/hooks"
import { loginSchema, type LoginFormValues } from "@/features/auth/schema"

function LoginPage() {
  // useLogin — мутация входа (запрос + сохранение токена + навигация).
  const mutation = useLogin()

  // react-hook-form держит состояние полей без ручных useState.
  // zodResolver гоняет значения через loginSchema перед отправкой —
  // при ошибке заполняет formState.errors и не вызывает onSubmit.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  // Ошибка от бэкенда (после успешной клиентской валидации):
  // 401 — неверные данные, остальное — недоступный сервер и т.п.
  const serverError = mutation.isError
    ? isAxiosError(mutation.error) && mutation.error.response?.status === 401
      ? "Неверный email или пароль"
      : "Не удалось войти. Проверь, что бэкенд запущен."
    : null

  return (
    <main className='flex min-h-svh flex-col items-center justify-center p-5'>
      <form onSubmit={onSubmit} className='flex w-full max-w-sm flex-col gap-4'>
        <h1 className='text-2xl font-bold'>Вход</h1>

        <label className='flex flex-col gap-1 text-sm'>
          Email
          <Input type='email' {...register("email")} />
          {errors.email && (
            <span className='text-destructive'>{errors.email.message}</span>
          )}
        </label>

        <label className='flex flex-col gap-1 text-sm'>
          Пароль
          <Input type='password' {...register("password")} />
          {errors.password && (
            <span className='text-destructive'>{errors.password.message}</span>
          )}
        </label>

        {serverError && <p className='text-sm text-destructive'>{serverError}</p>}

        <Button type='submit' disabled={mutation.isPending}>
          {mutation.isPending ? "Входим…" : "Войти"}
        </Button>
      </form>
    </main>
  )
}

export default LoginPage
