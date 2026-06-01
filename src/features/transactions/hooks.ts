import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createTransaction,
  createTransactionFromVoice,
  deleteTransaction,
  getTransaction,
  getTransactions,
  setTransactionCategory,
  updateTransaction,
} from "./api"
import type { UpdateTransactionInput } from "./api"
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

// useTransaction — чтение одной транзакции по id под ключом
// transactionKeys.detail(id). Нужна для страницы детали: при переходе по прямой
// ссылке/обновлении страницы кеш списка может быть пустым, поэтому грузим точечно.
export function useTransaction(id: number) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => getTransaction(id),
    enabled: Number.isFinite(id),
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

// useUpdateTransaction — мутация правки транзакции. На вход id и подмножество
// полей. Инвалидация transactionKeys.all освежает и ленту, и кеш детали (общий
// префикс ключей), поэтому страница и список подтягивают свежие данные сами.
export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTransactionInput }) =>
      updateTransaction(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}

// useDeleteTransaction — мутация удаления транзакции по id. После успеха
// инвалидирует ленту, чтобы удалённая трата сразу пропала из списка.
export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}

// useCreateTransactionFromVoice — мутация голосового ввода. На вход — blob и
// имя файла (с расширением). После успеха инвалидирует ленту так же, как
// обычное создание. Сам компонент-диктофон отвечает только за запись/отправку.
export function useCreateTransactionFromVoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ audio, filename }: { audio: Blob; filename: string }) =>
      createTransactionFromVoice(audio, filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}

// useSetTransactionCategory — мутация подтверждения категории для pending-
export function useSetTransactionCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, categoryName }: { id: number; categoryName: string }) =>
      setTransactionCategory(id, categoryName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}
