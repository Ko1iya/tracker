import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  useDeleteTransaction,
  useTransaction,
} from "@/features/transactions/hooks"
import AddTransactionDialog from "@/features/transactions/AddTransactionDialog"
import CategoryConfirmPanel from "@/features/transactions/CategoryConfirmPanel"
import { useCategories } from "@/features/categories/hooks"
import { formatCurrency, formatDateTime } from "@/lib/format"

function TransactionDetailPage() {
  const { id } = useParams()
  const txId = Number(id)
  const navigate = useNavigate()

  const { data: tx, isLoading, isError } = useTransaction(txId)
  const { data: categories } = useCategories()
  const del = useDeleteTransaction()

  // Ссылка «назад» к ленте — общая для всех состояний страницы.
  const backLink = (
    <Link
      to='/'
      className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
    >
      <ArrowLeft className='h-4 w-4' />
      К ленте
    </Link>
  )

  if (isLoading) {
    return (
      <section className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
        {backLink}
        <p className='text-muted-foreground'>Загружаем транзакцию…</p>
      </section>
    )
  }

  // 404 с бэка (или невалидный id) приходит сюда же — показываем «не найдена».
  if (isError || !tx) {
    return (
      <section className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
        {backLink}
        <p className='text-destructive'>Транзакция не найдена.</p>
      </section>
    )
  }

  const categoryTitle =
    tx.categoryId != null
      ? (categories?.find((c) => c.id === tx.categoryId)?.title ?? null)
      : null

  const isIncome = tx.type === "INCOME"

  const handleDelete = () => {
    if (!window.confirm("Удалить эту транзакцию? Действие необратимо.")) return
    del.mutate(txId, {
      onSuccess: () => {
        toast.success("Транзакция удалена")
        navigate("/")
      },
      onError: () => toast.error("Не удалось удалить транзакцию"),
    })
  }

  return (
    <section className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
      {backLink}

      {/* Шапка: крупная сумма, тип и описание */}
      <div className='rounded-lg border border-gray-500/30 p-5'>
        <p className='text-sm text-muted-foreground'>
          {isIncome ? "Доход" : "Расход"}
        </p>
        <p
          className={
            isIncome
              ? "text-4xl font-bold text-green-600"
              : "text-4xl font-bold"
          }
        >
          {isIncome ? "+" : "−"}
          {formatCurrency(tx.amount, tx.currency)}
        </p>
        <p className='mt-2 text-lg'>{tx.description || "Без описания"}</p>
      </div>

      {/* Подтверждение категории — только пока трата ждёт авто-подтверждения */}
      {tx.autoConfirmAt && <CategoryConfirmPanel transaction={tx} />}

      {/* Подробности */}
      <dl className='flex flex-col divide-y divide-gray-500/15 rounded-lg border border-gray-500/30'>
        <div className='flex items-center justify-between gap-4 px-4 py-3'>
          <dt className='text-sm text-muted-foreground'>Дата</dt>
          <dd className='text-sm'>{formatDateTime(tx.date)}</dd>
        </div>
        <div className='flex items-center justify-between gap-4 px-4 py-3'>
          <dt className='text-sm text-muted-foreground'>Категория</dt>
          <dd className='text-sm'>
            {categoryTitle ?? (
              <span className='text-muted-foreground'>не указана</span>
            )}
          </dd>
        </div>
        <div className='flex items-center justify-between gap-4 px-4 py-3'>
          <dt className='text-sm text-muted-foreground'>Тип</dt>
          <dd className='text-sm'>{isIncome ? "Доход" : "Расход"}</dd>
        </div>
        <div className='flex items-center justify-between gap-4 px-4 py-3'>
          <dt className='text-sm text-muted-foreground'>Валюта</dt>
          <dd className='text-sm'>{tx.currency}</dd>
        </div>
      </dl>

      {/* Действия */}
      <div className='flex items-center justify-between gap-3'>
        <AddTransactionDialog
          transaction={tx}
          trigger={
            <Button variant='outline'>
              <Pencil />
              Редактировать
            </Button>
          }
        />
        <Button
          variant='destructive'
          onClick={handleDelete}
          disabled={del.isPending}
        >
          <Trash2 />
          {del.isPending ? "Удаляем…" : "Удалить"}
        </Button>
      </div>
    </section>
  )
}

export default TransactionDetailPage
