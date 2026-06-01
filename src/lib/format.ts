// Форматирование дат и денег через встроенный Intl (ECMA-402).
// Никаких внешних библиотек: для отображения дат/валюты Intl самодостаточен.

// Создание Intl.NumberFormat — относительно дорогая операция, поэтому
// кешируем готовые форматтеры по коду валюты и переиспользуем.
const currencyFormatters = new Map<string, Intl.NumberFormat>()

function currencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    })
    currencyFormatters.set(currency, formatter)
  }
  return formatter
}

// amount приходит с бэкенда строкой (Prisma Decimal сериализуется в JSON
// как строка), поэтому принимаем оба типа и приводим к числу.
export function formatCurrency(
  amount: number | string,
  currency: string,
): string {
  return currencyFormatter(currency).format(Number(amount))
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
})

export function formatDate(date: string | Date): string {
  return dateFormatter.format(new Date(date))
}

// Полная дата со временем — для подробной карточки транзакции
// (например, «5 мая 2026 г., 14:30»).
const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export function formatDateTime(date: string | Date): string {
  return dateTimeFormatter.format(new Date(date))
}
