import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "react-router-dom"
import { isAxiosError } from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRegisterMutation } from "@/features/auth/hooks"
import { registerSchema, type RegisterFormValues } from "@/features/auth/schema"

function RegisterPage() {
  const mutation = useRegisterMutation()

  // register из useForm конфликтует по имени с register-запросом.
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", passwordConfirm: "" },
  })

  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  // 403 — email не в allowlist бэкенда, 409 — пользователь уже есть.
  const status = isAxiosError(mutation.error)
    ? mutation.error.response?.status
    : undefined

  const serverError = mutation.isError
    ? status === 403
      ? "Регистрация закрыта: этот email не в списке приглашённых."
      : status === 409
        ? "Пользователь с таким email уже зарегистрирован"
        : "Не удалось зарегистрироваться. Проверь, что бэкенд запущен."
    : null

  return (
    <main className='flex min-h-svh flex-col items-center justify-center p-5'>
      <form onSubmit={onSubmit} className='flex w-full max-w-sm flex-col gap-4'>
        <h1 className='text-2xl font-bold'>Регистрация</h1>

        <label className='flex flex-col gap-1 text-sm'>
          Email
          <Input type='email' {...registerField("email")} />
          {errors.email && (
            <span className='text-destructive'>{errors.email.message}</span>
          )}
        </label>

        <label className='flex flex-col gap-1 text-sm'>
          Пароль
          <Input type='password' {...registerField("password")} />
          {errors.password && (
            <span className='text-destructive'>{errors.password.message}</span>
          )}
        </label>

        <label className='flex flex-col gap-1 text-sm'>
          Повторите пароль
          <Input type='password' {...registerField("passwordConfirm")} />
          {errors.passwordConfirm && (
            <span className='text-destructive'>
              {errors.passwordConfirm.message}
            </span>
          )}
        </label>

        {serverError && <p className='text-sm text-destructive'>{serverError}</p>}

        <Button type='submit' disabled={mutation.isPending}>
          {mutation.isPending ? "Создаём аккаунт…" : "Зарегистрироваться"}
        </Button>

        <p className='text-center text-sm text-muted-foreground'>
          Уже есть аккаунт?{" "}
          <Link to='/login' className='underline'>
            Войти
          </Link>
        </p>
      </form>
    </main>
  )
}

export default RegisterPage
