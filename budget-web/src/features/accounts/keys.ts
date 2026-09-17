// Реестр query-ключей TanStack Query для счетов.
// Чтение списка и инвалидация после мутаций используют один ключ.
export const accountKeys = {
  all: ["accounts"] as const,
}
