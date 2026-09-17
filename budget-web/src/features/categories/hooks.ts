import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Category } from "./api"
import {
  createCategory,
  deleteCategory,
  getCategories,
  normalizeCategoryTitle,
} from "./api"
import { categoryKeys } from "./keys"

// useCategoriesQuery — чтение списка категорий пользователя с кешированием под
// ключом categoryKeys.all. Используется в форме создания транзакции и на
// экране управления категориями.
export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: getCategories,
  })
}

// useCreateCategoryMutation — создание категории с оптимистичным добавлением в
// кеш: чип появляется мгновенно, ещё до ответа сервера. При ошибке откатываем
// список, после завершения инвалидируем, чтобы заменить временную запись
// настоящей (с реальным id и счётчиком с бэка).
export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCategory,
    onMutate: async (title: string) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all })
      const prev = queryClient.getQueryData<Category[]>(categoryKeys.all)

      // Временная запись с отрицательным id — он не пересечётся с серверными.
      const optimistic: Category = {
        id: -Date.now(),
        title: normalizeCategoryTitle(title),
        userId: prev?.[0]?.userId ?? 0,
        transactionCount: 0,
      }
      queryClient.setQueryData<Category[]>(categoryKeys.all, (list = []) =>
        [...list, optimistic].sort((a, b) => a.title.localeCompare(b.title)),
      )
      return { prev }
    },
    onError: (_err, _title, context) => {
      if (context?.prev) {
        queryClient.setQueryData(categoryKeys.all, context.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

// useDeleteCategoryMutation — удаление категории. Оптимистичное скрытие делает
// сам экран (на время undo-окна), поэтому здесь только вызов и инвалидация
// после завершения — она и подтянет актуальный список при успехе, и вернёт
// строку при ошибке (например 409, если категорию успели заполнить
// транзакциями).
export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCategory,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}
