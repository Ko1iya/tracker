import { QueryClient } from "@tanstack/react-query"

// Глобальный клиент TanStack Query: кеширует ответы budget-api,
// дедуплицирует одинаковые запросы и управляет их перезапросом.
// Подключается через QueryClientProvider в main.tsx.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Данные считаются свежими 1 минуту — за это время повторные обращения
      // берутся из кеша без сетевого запроса.
      staleTime: 60_000,
      // Не перезапрашивать автоматически при возврате фокуса на вкладку.
      refetchOnWindowFocus: false,
      // Один повтор при сетевой ошибке (а не дефолтные три).
      retry: 1,
    },
  },
})
