import { useState } from "react"
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
import { useCreateTransaction } from "./hooks"
import { createTransactionSchema } from "./schema"
import { CATEGORY_OPTIONS } from "./categories"

// Модальное окно ручного добавления транзакции с триггером «+».
function AddTransactionDialog() {
  const [open, setOpen] = useState(false)
  const mutation = useCreateTransaction()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      amount: undefined,
      description: "",
      type: "EXPENSE",
      categoryId: CATEGORY_OPTIONS[0].id,
    },
  })

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      {
        amount: values.amount,
        type: values.type,
        // пустое описание → undefined (в БД null), categoryId не шлём
        description: values.description?.trim() || undefined,
      },
      {
        onSuccess: () => {
          reset()
          setOpen(false)
        },
      },
    )
  })

  // при закрытии чистим форму и сетевую ошибку
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      reset()
      mutation.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Добавить
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая транзакция</DialogTitle>
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

          <div className='flex flex-col gap-1.5'>
            <Label>Категория</Label>
            <Controller
              control={control}
              name='categoryId'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <span className='text-xs text-muted-foreground'>
              Пока не сохраняется: бэкенд не принимает категорию.
            </span>
          </div>

          {mutation.isError && (
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
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? "Сохраняем…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddTransactionDialog
