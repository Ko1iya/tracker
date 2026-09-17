import { api } from "@/lib/api"

// Счёт в том виде, в каком его отдаёт budget-api (модель Prisma).
// isDefault — дефолтный счёт пользователя, он ровно один (или ноль, если счетов нет).
export interface Account {
  id: number
  title: string
  isDefault: boolean
  userId: number
  transactionCount: number
}

// GET /accounts — список счетов текущего пользователя, отсортирован по title.
export async function getAccounts(): Promise<Account[]> {
  const { data } = await api.get<Account[]>("/accounts")
  return data
}

// POST /accounts — создаёт счёт. Первый счёт бэкенд делает дефолтным,
// при дубликате (тот же userId+title) отвечает 409 Conflict.
export async function createAccount(title: string): Promise<Account> {
  const { data } = await api.post<Account>("/accounts", { title })
  return data
}

// PATCH /accounts/:id/default — делает счёт дефолтным, снимая флаг с прежнего.
export async function setDefaultAccount(id: number): Promise<Account> {
  const { data } = await api.patch<Account>(`/accounts/${id}/default`)
  return data
}

// DELETE /accounts/:id — удаляет счёт. Транзакциям этого счёта бэкенд обнуляет
// accountId (они остаются), удалённый дефолт перевешивается на следующий счёт.
export async function deleteAccount(id: number): Promise<void> {
  await api.delete(`/accounts/${id}`)
}
