// Заглушка категорий: пока нет GET /categories, список захардкожен и на сервер не уходит.
export interface CategoryOption {
  id: string
  title: string
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "food", title: "Еда" },
  { id: "transport", title: "Транспорт" },
  { id: "housing", title: "Жильё" },
  { id: "entertainment", title: "Развлечения" },
  { id: "health", title: "Здоровье" },
  { id: "other", title: "Другое" },
]
