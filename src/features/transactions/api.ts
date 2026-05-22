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
}

// GET /transactions — список транзакций текущего пользователя (требует JWT).
export async function getTransactions(): Promise<Transaction[]> {
  const { data } = await api.get<Transaction[]>("/transactions")
  return data
}

// Тело запроса на создание. Совпадает с CreateTransactionDto бэкенда:
// categoryId сюда не входит намеренно — budget-api его пока не принимает.
export interface CreateTransactionInput {
  amount: number
  type: TransactionType
  description?: string
}

// POST /transactions — создаёт транзакцию у текущего пользователя (требует JWT).
// userId бэкенд берёт из JWT, currency/date проставляет дефолтами (RUB, now).
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  const { data } = await api.post<Transaction>("/transactions", input)
  return data
}
