import { useTransactions } from "@/features/transactions/hooks"
import { monthlyExpenses } from "@/features/transactions/totals"
import AddTransactionDialog from "@/features/transactions/AddTransactionDialog"
import { formatCurrency, formatDate } from "@/lib/format"

function HomePage() {
  const { data, isLoading, isError } = useTransactions()

  if (isLoading) {
    return <p className='text-muted-foreground'>Загружаем транзакции…</p>
  }

  if (isError) {
    return <p className='text-destructive'>Не удалось загрузить транзакции.</p>
  }

  const transactions = data ?? []
  const spent = monthlyExpenses(transactions)

  return (
    <section className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
      <div className='rounded-lg border border-gray-500/30 p-4'>
        <p className='text-sm text-muted-foreground'>Расходы за этот месяц</p>
        <p className='text-3xl font-bold'>{formatCurrency(spent, "RUB")}</p>
      </div>

      <div>
        <div className='mb-3 flex items-center justify-between gap-4'>
          <h1 className='text-lg font-semibold'>Лента расходов</h1>
          <AddTransactionDialog />
        </div>
        {transactions.length === 0 ? (
          <p className='text-muted-foreground'>Пока нет ни одной транзакции.</p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {transactions.map((t) => (
              <li
                key={t.id}
                className='flex items-center justify-between gap-4 rounded-md border border-gray-500/20 px-4 py-3'
              >
                <div className='flex flex-col'>
                  <span className='font-medium'>
                    {t.description || "Без описания"}
                  </span>
                  <span className='text-sm text-muted-foreground'>
                    {formatDate(t.date)}
                  </span>
                </div>
                <span
                  className={
                    t.type === "INCOME"
                      ? "font-semibold text-green-600"
                      : "font-semibold"
                  }
                >
                  {t.type === "INCOME" ? "+" : "−"}
                  {formatCurrency(t.amount, t.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default HomePage
