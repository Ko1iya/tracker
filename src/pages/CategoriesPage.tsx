import { useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router-dom"
import { isAxiosError } from "axios"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { normalizeCategoryTitle } from "@/features/categories/api"
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
} from "@/features/categories/hooks"
import { cn } from "@/lib/utils"

// Сколько держим undo-тост, прежде чем реально удалить на бэке.
const UNDO_MS = 2000

// Экран управления категориями (/categories): добавление с мгновенным чипом,
// счётчик использования и удаление пустых категорий с возможностью отмены.
// Непустые категории удалять нельзя — бэк отвечает 409, поэтому крестик у них
// заблокирован с подсказкой.
function CategoriesPage() {
  const { data: categories, isLoading, isError } = useCategories()
  const createCat = useCreateCategory()
  const deleteCat = useDeleteCategory()

  const [title, setTitle] = useState("")
  // id подсвеченной категории — мигаем существующей при попытке создать дубль.
  const [flashId, setFlashId] = useState<number | null>(null)
  // id категорий, спрятанных на время undo-окна (ещё не удалённых на бэке).
  const [pendingIds, setPendingIds] = useState<number[]>([])
  // Таймеры отложенного удаления по id — чтобы отменить по «Отменить».
  const timers = useRef<Map<number, number>>(new Map())

  // Если ушли со страницы во время undo-окна — отменяем отложенные удаления
  // (безопасный выбор: ничего не теряем, категория остаётся).
  useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => window.clearTimeout(t))
  }, [])

  const normalized = normalizeCategoryTitle(title)

  // Видимый список: прячем те, что в процессе undo-удаления.
  const visible = useMemo(
    () => (categories ?? []).filter((c) => !pendingIds.includes(c.id)),
    [categories, pendingIds],
  )

  const flash = (id: number) => {
    setFlashId(id)
    window.setTimeout(
      () => setFlashId((cur) => (cur === id ? null : cur)),
      1200,
    )
  }

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!normalized) return

    // Дубликат уже загружен — не шлём запрос, подсвечиваем существующую.
    const existing = (categories ?? []).find((c) => c.title === normalized)
    if (existing) {
      flash(existing.id)
      setTitle("")
      return
    }

    createCat.mutate(normalized, {
      onError: (err) => {
        // 409 на гонке (такую же создали в другой вкладке) — мягкое сообщение.
        const msg =
          isAxiosError(err) && err.response?.status === 409
            ? "Такая категория уже есть"
            : "Не удалось создать категорию"
        toast.error(msg)
      },
    })
    setTitle("")
  }

  // Реальное удаление на бэке — по истечении undo-окна.
  const commitDelete = (id: number) => {
    timers.current.delete(id)
    deleteCat.mutate(id, {
      onError: (err) => {
        const msg =
          isAxiosError(err) && err.response?.status === 409
            ? "Категория используется — удалить нельзя"
            : "Не удалось удалить категорию"
        toast.error(msg)
      },
      // Снимаем скрытие в любом случае: при успехе строки уже нет в списке,
      // при ошибке инвалидация вернёт её обратно.
      onSettled: () => {
        setPendingIds((ids) => ids.filter((x) => x !== id))
      },
    })
  }

  const handleDelete = (id: number, name: string) => {
    setPendingIds((ids) => [...ids, id])
    const timer = window.setTimeout(() => commitDelete(id), UNDO_MS)
    timers.current.set(id, timer)

    toast(`«${name}» удалена`, {
      duration: UNDO_MS,
      action: {
        label: "Отменить",
        onClick: () => {
          const t = timers.current.get(id)
          if (t) window.clearTimeout(t)
          timers.current.delete(id)
          setPendingIds((ids) => ids.filter((x) => x !== id))
        },
      },
    })
  }

  return (
    <section className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
      <Link
        to='/settings'
        className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
      >
        <ArrowLeft className='h-4 w-4' />К профилю
      </Link>

      <h1 className='text-lg font-semibold'>Категории</h1>

      <form onSubmit={handleAdd} className='flex items-stretch gap-2'>
        <Input
          type='text'
          placeholder='Новая категория'
          value={title}
          maxLength={50}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          type='submit'
          size='lg'
          className='h-auto bg-clip-border'
          disabled={!normalized}
        >
          <Plus />
          Добавить
        </Button>
      </form>

      {isLoading && (
        <p className='text-muted-foreground'>Загружаем категории…</p>
      )}

      {isError && (
        <p className='text-destructive'>Не удалось загрузить категории.</p>
      )}

      {!isLoading && !isError && visible.length === 0 && (
        <p className='text-muted-foreground'>
          Пока нет категорий. Добавь первую выше.
        </p>
      )}

      {visible.length > 0 && (
        <ul className='flex flex-col divide-y divide-gray-500/15 rounded-lg border border-gray-500/30'>
          {visible.map((category) => {
            const used = category.transactionCount > 0
            return (
              <li
                key={category.id}
                className={cn(
                  "flex items-center justify-between gap-3 px-4 py-3 transition-colors",
                  flashId === category.id && "bg-primary/10",
                )}
              >
                <div className='flex items-center gap-2'>
                  <span className='text-sm'>{category.title}</span>
                  {used && (
                    <span className='rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'>
                      {category.transactionCount}
                    </span>
                  )}
                </div>

                <button
                  type='button'
                  onClick={() => handleDelete(category.id, category.title)}
                  disabled={used}
                  aria-label={
                    used
                      ? `«${category.title}» используется в ${category.transactionCount} транзакциях`
                      : `Удалить «${category.title}»`
                  }
                  title={
                    used
                      ? `Используется в ${category.transactionCount} транзакциях — сначала смените категорию у них`
                      : undefined
                  }
                  className={cn(
                    "rounded p-1.5 transition-colors",
                    used
                      ? "cursor-not-allowed text-muted-foreground/40"
                      : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                  )}
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default CategoriesPage
