import { z } from "zod"

// Схема формы входа. Это валидация на стороне клиента (UX-подсказки до отправки);
// настоящую проверку всё равно делает budget-api через ValidationPipe + LoginDto.
// Держим поля синхронными с LoginDto бэкенда: email (IsEmail), password (IsString).
export const loginSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
})

// Тип значений формы выводится прямо из схемы — один источник правды.
export type LoginFormValues = z.infer<typeof loginSchema>
