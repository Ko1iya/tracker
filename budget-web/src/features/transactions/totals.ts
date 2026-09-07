import type { Transaction } from "./api"

// Id категорий, отсортированные по частоте использования (число транзакций
// с этой категорией), от самой частой. Считаем по уже загруженным транзакциям.
// Чистая функция без React — легко переиспользовать и тестировать.
export function topCategoryIds(
  transactions: Transaction[],
  limit = 5,
): number[] {
  const counts = new Map<number, number>()
  for (const t of transactions) {
    if (t.categoryId == null) continue
    counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
}

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
