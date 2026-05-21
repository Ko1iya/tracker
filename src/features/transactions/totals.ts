import type { Transaction } from "./api"

// Сумма расходов (EXPENSE) за текущий календарный месяц.
// Чистая функция без React — её легко переиспользовать и тестировать.
export function monthlyExpenses(transactions: Transaction[]): number {
  const now = new Date()
  return transactions
    .filter((t) => t.type === "EXPENSE")
    .filter((t) => {
      const d = new Date(t.date)
      return (
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      )
    })
    .reduce((sum, t) => sum + Number(t.amount), 0)
}
