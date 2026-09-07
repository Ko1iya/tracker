import { useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Category } from "@/features/categories/api"
import { normalizeCategoryTitle } from "@/features/categories/api"

interface Props {
  // Топ-частых категорий для радиокнопок (до 5).
  frequent: Category[]
  // Все категории пользователя — для автодополнения в поле ввода.
  categories: Category[]
  // Выбранная радиокнопка (id строкой) либо "".
  categoryId: string
  // Текст поля ручного ввода (он же название новой категории).
  query: string
  onChange: (next: { categoryId: string; query: string }) => void
  error?: string
}

// Поле выбора категории: радиокнопки топ-частых + поле ручного ввода с
// автодополнением по существующим категориям. Радио и поле — взаимоисключающие
// источники: выбор одного очищает другой.
function CategoryPicker({
  frequent,
  categories,
  categoryId,
  query,
  onChange,
  error,
}: Props) {
  const [open, setOpen] = useState(false)

  const q = query.trim().toLowerCase()
  // Совпадения для дропдауна — по подстроке, без учёта регистра.
  const matches = q
    ? categories.filter((c) => c.title.toLowerCase().includes(q))
    : []

  const normalized = normalizeCategoryTitle(query)
  // Точное совпадение по нормализованному имени — значит категория уже есть.
  const exactExists = categories.some((c) => c.title === normalized)
  const willCreate = normalized.length > 0 && !exactExists

  // Выбор радиокнопки: ставим id, очищаем поле ввода.
  const pickRadio = (id: number) => {
    onChange({ categoryId: String(id), query: "" })
  }

  // Набор текста: снимаем радиовыбор, если что-то введено.
  const typeQuery = (value: string) => {
    onChange({ categoryId: value.trim() ? "" : categoryId, query: value })
  }

  // Клик по варианту в дропдауне: подставляем его название.
  const pickSuggestion = (title: string) => {
    onChange({ categoryId: "", query: title })
    setOpen(false)
  }

  return (
    <div className='flex flex-col gap-3'>
      {frequent.length > 0 && (
        <div role='radiogroup' className='flex flex-wrap gap-2'>
          {frequent.map((category) => {
            const selected = categoryId === String(category.id)
            return (
              <button
                key={category.id}
                type='button'
                role='radio'
                aria-checked={selected}
                onClick={() => pickRadio(category.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-gray-500/30 hover:bg-accent",
                )}
              >
                {category.title}
              </button>
            )
          })}
        </div>
      )}

      <div className='relative'>
        <Input
          type='text'
          placeholder='Другая категория — найти или создать'
          value={query}
          maxLength={50}
          onChange={(e) => typeQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          // Задержка, чтобы клик по опции успел отработать до закрытия.
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        />

        {open && query.trim() && (
          <ul className='absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-500/30 bg-popover p-1 shadow-md'>
            {matches.map((category) => (
              <li key={category.id}>
                <button
                  type='button'
                  // preventDefault на mousedown — чтобы blur поля не сработал
                  // раньше клика и не закрыл список.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(category.title)}
                  className='w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent'
                >
                  {category.title}
                </button>
              </li>
            ))}
            {willCreate && (
              <li className='px-2 py-1.5 text-sm text-amber-600 dark:text-amber-400'>
                Будет создана новая категория «{normalized}»
              </li>
            )}
            {matches.length === 0 && !willCreate && (
              <li className='px-2 py-1.5 text-sm text-muted-foreground'>
                Ничего не найдено
              </li>
            )}
          </ul>
        )}
      </div>

      {error && <span className='text-sm text-destructive'>{error}</span>}
    </div>
  )
}

export default CategoryPicker
