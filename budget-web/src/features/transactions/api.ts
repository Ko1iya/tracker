import { api } from "@/lib/api"

export type TransactionType = "INCOME" | "EXPENSE"

// Транзакция в том виде, в каком её отдаёт budget-api (модель Prisma).
// amount — строка, т.к. Prisma Decimal сериализуется в JSON как строка.
export interface Transaction {
  id: number
  amount: string
  currency: string
  date: string
  description: string | null
  type: TransactionType
  categoryId: number | null
  userId: number
  suggestedCategories: string[]
  autoConfirmAt: string | null
  categoryPending?: boolean
}

// GET /transactions — список транзакций текущего пользователя (требует JWT).
export async function getTransactions(): Promise<Transaction[]> {
  const { data } = await api.get<Transaction[]>("/transactions")
  return data
}

// GET /transactions/:id — одна транзакция текущего пользователя (требует JWT).
// Бэкенд отвечает 404, если транзакция не найдена или принадлежит другому юзеру.
export async function getTransaction(id: number): Promise<Transaction> {
  const { data } = await api.get<Transaction>(`/transactions/${id}`)
  return data
}

// Тело запроса на создание. Совпадает с CreateTransactionDto бэкенда.

export interface CreateTransactionInput {
  amount: number
  type: TransactionType
  description?: string
  categoryId?: number
}

// POST /transactions — создаёт транзакцию у текущего пользователя (требует JWT).
// userId бэкенд берёт из JWT, currency/date проставляет дефолтами (RUB, now).
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  const { data } = await api.post<Transaction>("/transactions", input)
  return data
}

// Тело запроса на правку. PATCH принимает любое подмножество полей создания
// (на бэке UpdateTransactionDto = PartialType(CreateTransactionDto)).
export type UpdateTransactionInput = Partial<CreateTransactionInput>

// PATCH /transactions/:id — обновляет транзакцию (требует JWT). Поля, которых
// нет в input, бэкенд не трогает. Возвращает обновлённую транзакцию.
export async function updateTransaction(
  id: number,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const { data } = await api.patch<Transaction>(`/transactions/${id}`, input)
  return data
}

// DELETE /transactions/:id — удаляет транзакцию (требует JWT). Бэкенд
// возвращает { id } удалённой записи.
export async function deleteTransaction(id: number): Promise<{ id: number }> {
  const { data } = await api.delete<{ id: number }>(`/transactions/${id}`)
  return data
}

// POST /transactions/voice — голосовой ввод (multipart/form-data, поле `audio`).
// Бэкенд ограничивает размер 1 МБ и принимает только mime audio/*.

export async function createTransactionFromVoice(
  audio: Blob,
  filename: string,
): Promise<Transaction> {
  const form = new FormData()
  form.append("audio", audio, filename)
  const { data } = await api.post<Transaction>("/transactions/voice", form)
  return data
}

// PATCH /transactions/:id/category — подтверждаем категорию для pending-
// транзакции. Имя категории (существующее или новое — бэк найдёт-или-создаст).
export async function setTransactionCategory(
  id: number,
  categoryName: string,
): Promise<Transaction> {
  const { data } = await api.patch<Transaction>(
    `/transactions/${id}/category`,
    {
      categoryName,
    },
  )
  return data
}
