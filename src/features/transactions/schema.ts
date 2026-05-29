import { z } from "zod"

// Валидация формы создания транзакции.
// Категория задаётся одним из двух путей: радиокнопка (categoryId — id строкой)
// либо поле ручного ввода (categoryInput — название существующей/новой).
// Категория обязательна; готовый числовой categoryId собирает компонент.
export const createTransactionSchema = z
  .object({
    // coerce: <input> отдаёт строку, приводим к числу до проверок
    amount: z.coerce
      .number("Введите сумму")
      .positive("Сумма должна быть больше нуля"),
    description: z.string().max(255, "Не длиннее 255 символов").optional(),
    type: z.enum(["INCOME", "EXPENSE"]),
    categoryId: z.string(),
    categoryInput: z.string().max(50, "Не длиннее 50 символов"),
  })
  .superRefine((values, ctx) => {
    if (values.categoryId === "" && !values.categoryInput.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryInput"],
        message: "Выберите или введите категорию",
      })
    }
  })

export type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>
