import { api } from "@/lib/api"

// Категория в том виде, в каком её отдаёт budget-api (модель Prisma).
// Категории персональные: уникальны в паре (userId, title).
export interface Category {
  id: number
  title: string
  userId: number
}

// GET /categories — список категорий текущего пользователя (требует JWT).
export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/categories")
  return data
}

// POST /categories — создаёт категорию по названию (требует JWT).
// Бэкенд нормализует title (trim + первая буква в верхний регистр) и при
// дубликате (тот же userId+title) отвечает 409 Conflict.
export async function createCategory(title: string): Promise<Category> {
  const { data } = await api.post<Category>("/categories", { title })
  return data
}

// Нормализация названия категории — копия серверной (normalize-title.ts):
// trim + первая буква в верхний регистр. Нужна, чтобы до запроса найти уже
// существующую категорию в загруженном списке и не ловить лишний 409.
export function normalizeCategoryTitle(raw: string): string {
  const t = raw.trim()
  return t ? t[0].toUpperCase() + t.slice(1) : t
}
