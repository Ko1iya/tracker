import { Button } from "@/components/ui/button"

function LoginPage() {
  return (
    <main className='flex min-h-svh flex-col items-center justify-center gap-4'>
      <h1 className='text-2xl font-bold'>Вход</h1>
      <p className='text-muted-foreground'>Здесь появится форма авторизации.</p>
      <Button>Войти</Button>
    </main>
  )
}

export default LoginPage
