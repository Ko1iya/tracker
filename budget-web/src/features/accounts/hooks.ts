import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Account } from "./api"
import {
  createAccount,
  deleteAccount,
  getAccounts,
  setDefaultAccount,
} from "./api"
import { transactionKeys } from "@/features/transactions/keys"
import { accountKeys } from "./keys"

// useAccounts — чтение списка счетов с кешированием под ключом accountKeys.all.
// Используется на экране счетов, в диалоге транзакции и в её карточке.
export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.all,
    queryFn: getAccounts,
  })
}

// useCreateAccount — создание счёта с оптимистичным добавлением в кеш: строка
// появляется мгновенно. При ошибке откатываем, после завершения инвалидируем,
// чтобы заменить временную запись настоящей (с реальным id и isDefault с бэка).
export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAccount,
    onMutate: async (title: string) => {
      await queryClient.cancelQueries({ queryKey: accountKeys.all })
      const prev = queryClient.getQueryData<Account[]>(accountKeys.all)

      // Временная запись с отрицательным id — он не пересечётся с серверными.
      const optimistic: Account = {
        id: -Date.now(),
        title: title.trim(),
        // Первый счёт пользователя бэкенд делает дефолтным — повторяем локально.
        isDefault: (prev?.length ?? 0) === 0,
        userId: prev?.[0]?.userId ?? 0,
        transactionCount: 0,
      }
      queryClient.setQueryData<Account[]>(accountKeys.all, (list = []) =>
        [...list, optimistic].sort((a, b) => a.title.localeCompare(b.title)),
      )
      return { prev }
    },
    onError: (_err, _title, context) => {
      if (context?.prev) {
        queryClient.setQueryData(accountKeys.all, context.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
    },
  })
}

// useSetDefaultAccount — смена дефолтного счёта. Флаг переставляем в кеше сразу
// (кнопка отзывчива), при ошибке откатываем, в конце инвалидируем.
export function useSetDefaultAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setDefaultAccount,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: accountKeys.all })
      const prev = queryClient.getQueryData<Account[]>(accountKeys.all)
      queryClient.setQueryData<Account[]>(accountKeys.all, (list = []) =>
        list.map((a) => ({ ...a, isDefault: a.id === id })),
      )
      return { prev }
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(accountKeys.all, context.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
    },
  })
}

// useDeleteAccount — удаление счёта. Оптимистичное скрытие делает сам экран (на
// время undo-окна), поэтому здесь только вызов и инвалидация после завершения:
// она подтянет новый дефолт при успехе и вернёт строку при ошибке.
// Транзакции удалённого счёта тоже меняются (accountId → null), поэтому
// сбрасываем и их кеш.
export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAccount,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}
