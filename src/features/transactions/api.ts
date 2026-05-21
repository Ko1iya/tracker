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
