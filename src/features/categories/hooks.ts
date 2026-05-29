import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createCategory, getCategories } from "./api"
import { categoryKeys } from "./keys"

// useCategories — чтение списка категорий пользователя с кешированием под
// ключом categoryKeys.all. Используется в форме создания транзакции.
export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: getCategories,
  })
}

// useCreateCategory — мутация создания категории. После успеха инвалидирует
// кеш списка, чтобы новая категория сразу появилась в выпадающем списке.
export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}
