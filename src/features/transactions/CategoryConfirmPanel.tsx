import { useEffect, useMemo, useState } from "react"
import { Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Transaction } from "./api"
import { useSetTransactionCategory } from "./hooks"

interface Props {
  transaction: Transaction
}

// Сколько минут осталось до auto-confirm. Округляем вверх, чтобы 30 секунд
// не показывались как «0 мин».
function minutesUntil(iso: string | null): number {
  if (!iso) return 0
  const diffMs = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / 60_000))
}

// Заметный блок подтверждения pending-категории для страницы детали транзакции:
// обратный отсчёт до autoConfirmAt + чипсы-предложения + поле «Своя категория».
function CategoryConfirmPanel({ transaction }: Props) {
  const mutation = useSetTransactionCategory()
  const [custom, setCustom] = useState("")
  const [minutesLeft, setMinutesLeft] = useState(() =>
    minutesUntil(transaction.autoConfirmAt),
  )

  // Тикаем раз в 30с — крон работает с минутной точностью, чаще нет смысла.
  useEffect(() => {
    const id = window.setInterval(() => {
      setMinutesLeft(minutesUntil(transaction.autoConfirmAt))
    }, 30_000)
    return () => window.clearInterval(id)
  }, [transaction.autoConfirmAt])

  const suggestions = useMemo(
    () => transaction.suggestedCategories ?? [],
    [transaction.suggestedCategories],
  )

  const submit = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || mutation.isPending) return
    mutation.mutate(
      { id: transaction.id, categoryName: trimmed },
      { onSuccess: () => setCustom("") },
    )
  }

  const countdown =
    minutesLeft > 0 ? `осталось ${minutesLeft} мин` : "вот-вот подтвердится"

  return (
    <div className='flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2 text-amber-700 dark:text-amber-300'>
          {mutation.isPending ? (
            <Loader2 className='h-4 w-4 shrink-0 animate-spin' />
          ) : (
            <Clock className='h-4 w-4 shrink-0' />
          )}
          <span className='text-sm font-medium'>Категория уточняется</span>
        </div>
        <span className='shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-amber-700 dark:text-amber-300'>
          {countdown}
        </span>
      </div>

      <p className='text-sm text-muted-foreground'>
        Выбери подходящую категорию или введи свою — иначе она подтвердится
        автоматически.
      </p>

      {suggestions.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {suggestions.map((name) => (
            <Button
              key={name}
              type='button'
              size='sm'
              variant='outline'
              disabled={mutation.isPending}
              onClick={() => submit(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      )}

      <form
        className='flex items-center gap-2'
        onSubmit={(e) => {
          e.preventDefault()
          submit(custom)
        }}
      >
        <Input
          type='text'
          placeholder='Своя категория'
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          disabled={mutation.isPending}
          maxLength={50}
        />
        <Button
          type='submit'
          size='sm'
          disabled={mutation.isPending || custom.trim().length === 0}
        >
          Сохранить
        </Button>
      </form>

      {mutation.isError && (
        <span className='text-xs text-destructive'>
          Не удалось сохранить категорию. Попробуй ещё раз.
        </span>
      )}
    </div>
  )
}

export default CategoryConfirmPanel
