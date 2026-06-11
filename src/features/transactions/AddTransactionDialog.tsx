import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCategories, useCreateCategory } from "@/features/categories/hooks"
import { normalizeCategoryTitle } from "@/features/categories/api"
import type { Category } from "@/features/categories/api"
import type { Transaction } from "./api"
import {
  useCreateTransaction,
  useTransactions,
  useUpdateTransaction,
} from "./hooks"
import { createTransactionSchema } from "./schema"
import { topCategoryIds } from "./totals"
import CategoryPicker from "./CategoryPicker"

// Модальное окно добавления/правки транзакции.
// trigger — кастомный элемент-триггер (например, круглая кнопка нижней панели);
// если не передан, рендерим дефолтную кнопку «Добавить».
// transaction — если передана, диалог работает в режиме правки: поля заполнены
// её значениями, сохранение шлёт PATCH вместо POST.
function AddTransactionDialog({
  trigger,
  transaction,
}: {
  trigger?: ReactNode
  transaction?: Transaction
}) {
  const isEdit = Boolean(transaction)
  const [open, setOpen] = useState(false)
  const createTx = useCreateTransaction()
  const updateTx = useUpdateTransaction()
  const createCat = useCreateCategory()
  const { data: categories } = useCategories()
  const { data: transactions } = useTransactions()

  const allCategories: Category[] = useMemo(
    () => categories ?? [],
    [categories],
  )

  // Топ-частых категорий для радиокнопок: id из частот резолвим в категории.
  // Fallback (нет частотных данных) — первые до 5 категорий из справочника.
  // В режиме правки гарантируем, что текущая категория траты есть среди чипсов —
  // иначе радиовыбор был бы выставлен, но визуально не подсвечен.
  // Мемоизация — чтобы массив не пересоздавался каждый рендер и не дёргал эффект.
  const frequent = useMemo(() => {
    const topIds = topCategoryIds(transactions ?? [])
    const frequentFromUsage = topIds
      .map((id) => allCategories.find((c) => c.id === id))
      .filter((c): c is Category => c !== undefined)
    const base =
      frequentFromUsage.length > 0
        ? frequentFromUsage
        : allCategories.slice(0, 5)
    const current =
      transaction?.categoryId != null
        ? allCategories.find((c) => c.id === transaction.categoryId)
        : undefined
    return current && !base.some((c) => c.id === current.id)
      ? [current, ...base]
      : base
  }, [allCategories, transactions, transaction])

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      amount: undefined,
      description: "",
      type: "EXPENSE",
      categoryId: "",
      categoryInput: "",
    },
  })

  const categoryId = watch("categoryId")
  const categoryInput = watch("categoryInput")

  // В режиме правки при открытии заполняем форму значениями транзакции.
  // Категорию ставим радиовыбором (её id уже гарантированно есть среди чипсов).
  useEffect(() => {
    if (open && transaction) {
      reset({
        amount: Number(transaction.amount),
        description: transaction.description ?? "",
        type: transaction.type,
        categoryId:
          transaction.categoryId != null ? String(transaction.categoryId) : "",
        categoryInput: "",
      })
    }
  }, [open, transaction, reset])

  // Создание: предвыбор самой частой категории при открытии (если ничего не
  // выбрано). В режиме правки не вмешиваемся — там значения ставит эффект выше.
  useEffect(() => {
    if (
      !isEdit &&
      open &&
      categoryId === "" &&
      categoryInput === "" &&
      frequent[0]
    ) {
      setValue("categoryId", String(frequent[0].id))
    }
  }, [isEdit, open, categoryId, categoryInput, frequent, setValue])

  // Определяем categoryId для запроса: ручной ввод приоритетнее радиокнопки.
  const resolveCategoryId = async (): Promise<number | undefined> => {
    const q = categoryInput.trim()
    if (q) {
      const title = normalizeCategoryTitle(q)
      const existing = allCategories.find((c) => c.title === title)
      if (existing) return existing.id
      const created = await createCat.mutateAsync(title)
      return created.id
    }
    if (categoryId !== "") return Number(categoryId)
    return undefined
  }

  const onSubmit = handleSubmit(async (values) => {
    const resolvedCategoryId = await resolveCategoryId()
    const payload = {
      amount: values.amount,
      type: values.type,
      // пустое описание → undefined (в БД null)
      description: values.description?.trim() || undefined,
      categoryId: resolvedCategoryId,
    }
    if (transaction) {
      await updateTx.mutateAsync({ id: transaction.id, input: payload })
    } else {
      await createTx.mutateAsync(payload)
    }
    reset()
    setOpen(false)
  })

  // при закрытии чистим форму и сетевые ошибки
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      reset()
      createTx.reset()
      updateTx.reset()
      createCat.reset()
    }
  }

  const isPending =
    createTx.isPending || updateTx.isPending || createCat.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            Добавить
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Редактировать транзакцию" : "Новая транзакция"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='amount'>Сумма, ₽</Label>
            <Input
              id='amount'
              type='number'
              step='100'
              min='0'
              inputMode='decimal'
              placeholder='0.00'
              {...register("amount")}
            />
            {errors.amount && (
              <span className='text-sm text-destructive'>
                {errors.amount.message}
              </span>
            )}
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='description'>Описание</Label>
            <Input
              id='description'
              placeholder='Например, обед в кафе'
              {...register("description")}
            />
            {errors.description && (
              <span className='text-sm text-destructive'>
                {errors.description.message}
              </span>
            )}
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label>Тип</Label>
            {/* Radix Select — не нативный input, связываем через Controller */}
            <Controller
              control={control}
              name='type'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='EXPENSE'>Расход</SelectItem>
                    <SelectItem value='INCOME'>Доход</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className='flex flex-col gap-3'>
            <Label>Категория</Label>
            <CategoryPicker
              frequent={frequent}
              categories={allCategories}
              categoryId={categoryId}
              query={categoryInput}
              onChange={(next) => {
                setValue("categoryId", next.categoryId)
                setValue("categoryInput", next.query, {
                  shouldValidate: Boolean(errors.categoryInput),
                })
              }}
              error={errors.categoryInput?.message}
            />
          </div>

          {(createTx.isError || updateTx.isError || createCat.isError) && (
            <p className='text-sm text-destructive'>
              Не удалось сохранить. Проверь, что бэкенд запущен.
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type='button' variant='outline'>
                Отмена
              </Button>
            </DialogClose>
            <Button type='submit' disabled={isPending}>
              {isPending ? "Сохраняем…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddTransactionDialog
