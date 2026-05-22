import { z } from "zod"

// Валидация формы создания транзакции. categoryId — только для UI, на сервер не уходит.
export const createTransactionSchema = z.object({
  // coerce: <input> отдаёт строку, приводим к числу до проверок
  amount: z.coerce
    .number("Введите сумму")
    .positive("Сумма должна быть больше нуля"),
  description: z.string().max(255, "Не длиннее 255 символов").optional(),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().optional(),
})

export type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>
