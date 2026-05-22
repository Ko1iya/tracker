import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createTransaction, getTransactions } from "./api"
import { transactionKeys } from "./keys"

// useTransactions — чтение списка транзакций с кешированием под ключом
// transactionKeys.all. Компонент получает готовое data/isLoading/isError
// и не знает ни про эндпоинт, ни про ключ кеша.
export function useTransactions() {
  return useQuery({
    queryKey: transactionKeys.all,
    queryFn: getTransactions,
  })
}

// useCreateTransaction — мутация создания транзакции. После успеха инвалидирует
// кеш списка теми же ключами (transactionKeys.all), чтобы лента перезапросилась
// и новая трата появилась без ручного обновления страницы.
export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}
