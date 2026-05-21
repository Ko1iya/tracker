import { useQuery } from "@tanstack/react-query"
import { getTransactions } from "./api"
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
