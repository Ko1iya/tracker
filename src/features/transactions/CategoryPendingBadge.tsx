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

function CategoryPendingBadge({ transaction }: Props) {
  const mutation = useSetTransactionCategory()
  const [expanded, setExpanded] = useState(false)
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
      {
        onSuccess: () => {
          setExpanded(false)
          setCustom("")
        },
      },
    )
  }

  const countdown =
    minutesLeft > 0 ? `осталось ${minutesLeft} мин` : "вот-вот подтвердится"

  return (
    <div className='mt-2 flex flex-col gap-2'>
      <button
        type='button'
        onClick={() => setExpanded((v) => !v)}
        className='inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-300'
      >
        {mutation.isPending ? (
          <Loader2 className='h-3 w-3 animate-spin' />
        ) : (
          <Clock className='h-3 w-3' />
        )}
        Категория уточняется… · {countdown}
      </button>

      {expanded && (
        <div className='flex flex-col gap-2 rounded-md border border-gray-500/20 p-3'>
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
      )}
    </div>
  )
}

export default CategoryPendingBadge
