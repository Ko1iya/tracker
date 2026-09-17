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
import { categoryKeys } from "../categories/keys"

// useTransactionsQuery — чтение списка транзакций с кешированием под ключом
// transactionKeys.all. Компонент получает готовое data/isLoading/isError
// и не знает ни про эндпоинт, ни про ключ кеша.
export function useTransactionsQuery() {
  return useQuery({
    queryKey: transactionKeys.all,
    queryFn: getTransactions,
  })
}

// useTransactionQuery — чтение одной транзакции по id под ключом
// transactionKeys.detail(id). Нужна для страницы детали: при переходе по прямой
// ссылке/обновлении страницы кеш списка может быть пустым, поэтому грузим точечно.
export function useTransactionQuery(id: number) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => getTransaction(id),
    enabled: Number.isFinite(id),
  })
}

// useCreateTransactionMutation — мутация создания транзакции. После успеха
// инвалидирует кеш списка теми же ключами (transactionKeys.all), чтобы лента
// перезапросилась
// и новая трата появилась без ручного обновления страницы.
export function useCreateTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}

// useUpdateTransactionMutation — мутация правки транзакции. На вход id и
// подмножество полей. Инвалидация transactionKeys.all освежает и ленту, и кеш
// детали (общий префикс ключей), поэтому страница и список подтягивают свежие
// данные сами.
export function useUpdateTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number
      input: UpdateTransactionInput
    }) => updateTransaction(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}

// useDeleteTransactionMutation — мутация удаления транзакции по id. После
// успеха инвалидирует ленту, чтобы удалённая трата сразу пропала из списка.
export function useDeleteTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

// useCreateTransactionFromVoiceMutation — мутация голосового ввода. На вход —
// blob и имя файла (с расширением). После успеха инвалидирует ленту так же, как
// обычное создание. Сам компонент-диктофон отвечает только за запись/отправку.
export function useCreateTransactionFromVoiceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ audio, filename }: { audio: Blob; filename: string }) =>
      createTransactionFromVoice(audio, filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}

// useSetTransactionCategoryMutation — мутация подтверждения категории для
// pending-транзакции. Освежает и ленту, и справочник категорий (у категории
// мог измениться счётчик транзакций).
export function useSetTransactionCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, categoryName }: { id: number; categoryName: string }) =>
      setTransactionCategory(id, categoryName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}
