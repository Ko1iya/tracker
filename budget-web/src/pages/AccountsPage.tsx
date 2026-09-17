import { useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router-dom"
import { isAxiosError } from "axios"
import { ArrowLeft, Plus, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useSetDefaultAccount,
} from "@/features/accounts/hooks"
import { cn } from "@/lib/utils"

// Сколько держим undo-тост, прежде чем реально удалить на бэке.
const UNDO_MS = 2000

// Склонение «транзакция» для текста тоста при удалении счёта с транзакциями.
function pluralTransactions(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "транзакция"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return "транзакции"
  return "транзакций"
}

// Экран управления счетами (/accounts): добавление, пометка дефолтного и
// удаление с возможностью отмены. В отличие от категорий удалять можно любой
// счёт, включая непустой и дефолтный: транзакции останутся, но без счёта.
function AccountsPage() {
  const { data: accounts, isLoading, isError } = useAccounts()
  const createAcc = useCreateAccount()
  const deleteAcc = useDeleteAccount()
  const setDefault = useSetDefaultAccount()

  const [title, setTitle] = useState("")
  // id подсвеченного счёта — мигаем существующим при попытке создать дубль.
  const [flashId, setFlashId] = useState<number | null>(null)
  // id счетов, спрятанных на время undo-окна (ещё не удалённых на бэке).
  const [pendingIds, setPendingIds] = useState<number[]>([])
  // Таймеры отложенного удаления по id — чтобы отменить по «Отменить».
  const timers = useRef<Map<number, number>>(new Map())

  // Ушли со страницы во время undo-окна — отменяем отложенные удаления
  // (безопасный выбор: ничего не теряем, счёт остаётся).
  useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => window.clearTimeout(t))
  }, [])

  const normalized = title.trim()

  // Видимый список: прячем те, что в процессе undo-удаления.
  const visible = useMemo(
    () => (accounts ?? []).filter((a) => !pendingIds.includes(a.id)),
    [accounts, pendingIds],
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

    // Дубликат уже загружен — не шлём запрос, подсвечиваем существующий.
    const existing = (accounts ?? []).find((a) => a.title === normalized)
    if (existing) {
      flash(existing.id)
      setTitle("")
      return
    }

    createAcc.mutate(normalized, {
      onError: (err) => {
        // 409 на гонке (такой же завели в другой вкладке) — мягкое сообщение.
        const msg =
          isAxiosError(err) && err.response?.status === 409
            ? "Такой счёт уже есть"
            : "Не удалось создать счёт"
        toast.error(msg)
      },
    })
    setTitle("")
  }

  // Реальное удаление на бэке — по истечении undo-окна.
  const commitDelete = (id: number) => {
    timers.current.delete(id)
    deleteAcc.mutate(id, {
      onError: () => toast.error("Не удалось удалить счёт"),
      // Снимаем скрытие в любом случае: при успехе строки уже нет в списке,
      // при ошибке инвалидация вернёт её обратно.
      onSettled: () => {
        setPendingIds((ids) => ids.filter((x) => x !== id))
      },
    })
  }

  const handleDelete = (id: number, name: string, used: number) => {
    setPendingIds((ids) => [...ids, id])
    const timer = window.setTimeout(() => commitDelete(id), UNDO_MS)
    timers.current.set(id, timer)

    // В отличие от категорий счёт удаляется вместе с привязками: предупреждаем,
    // сколько трат останется без счёта.
    const suffix =
      used > 0
        ? ` — ${used} ${pluralTransactions(used)} останется без счёта`
        : ""
    toast(`«${name}» удалён${suffix}`, {
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

  const handleSetDefault = (id: number) => {
    setDefault.mutate(id, {
      onError: () => toast.error("Не удалось сменить счёт по умолчанию"),
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

      <h1 className='text-lg font-semibold'>Счета</h1>

      <form onSubmit={handleAdd} className='flex items-stretch gap-2'>
        <Input
          type='text'
          placeholder='Новый счёт'
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

      {isLoading && <p className='text-muted-foreground'>Загружаем счета…</p>}

      {isError && (
        <p className='text-destructive'>Не удалось загрузить счета.</p>
      )}

      {!isLoading && !isError && visible.length === 0 && (
        <p className='text-muted-foreground'>
          Пока нет счетов. Добавь первый выше — он станет счётом по умолчанию.
        </p>
      )}

      {visible.length > 0 && (
        <ul className='flex flex-col divide-y divide-gray-500/15 rounded-lg border border-gray-500/30'>
          {visible.map((account) => (
            <li
              key={account.id}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-3 transition-colors",
                flashId === account.id && "bg-primary/10",
              )}
            >
              <div className='flex items-center gap-2'>
                <span className='text-sm'>{account.title}</span>
                {account.isDefault && (
                  <span className='rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground'>
                    по умолчанию
                  </span>
                )}
                {account.transactionCount > 0 && (
                  <span className='rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'>
                    {account.transactionCount}
                  </span>
                )}
              </div>

              <div className='flex items-center gap-1'>
                {/* Дефолтный уже помечен чипом — кнопку показываем остальным */}
                {!account.isDefault && (
                  <button
                    type='button'
                    onClick={() => handleSetDefault(account.id)}
                    aria-label={`Сделать «${account.title}» счётом по умолчанию`}
                    title='Сделать счётом по умолчанию'
                    className='rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
                  >
                    <Star className='h-4 w-4' />
                  </button>
                )}

                <button
                  type='button'
                  onClick={() =>
                    handleDelete(
                      account.id,
                      account.title,
                      account.transactionCount,
                    )
                  }
                  aria-label={`Удалить «${account.title}»`}
                  className='rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive'
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AccountsPage
