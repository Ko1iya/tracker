/**
 * Абстракция парсера голосовых трат. LLM (или заглушка) получает
 * распознанный текст и список названий категорий пользователя, а возвращает
 * структурированный черновик транзакции.
 *
 * Это абстрактный класс, а не interface, намеренно: в NestJS абстрактный
 * класс одновременно работает и как тип, и как DI-токен. Благодаря этому в
 * сервис можно внедрять `TransactionParser`, а в модуле подменять конкретную
 * реализацию одной строкой (`useClass`), не трогая потребителей.
 */

/** Тип транзакции — совпадает с допустимыми значениями в схеме Prisma. */
export type ParsedTransactionType = 'INCOME' | 'EXPENSE';

/**
 * Что парсер извлекает из текста. Намеренно узкий набор: только семантические
 * поля. `id`, `userId`, `date` сюда не входят — это серверные поля
 * (id от БД, userId из JWT, date = now()).
 */
export interface ParsedTransaction {
  amount: number;
  currency: string;
  description: string;
  type: ParsedTransactionType;
  /** Точное название категории из списка пользователя или null, если совпадения нет. */
  category: string | null;
  /** Варианты для создания новой категории, если `category` === null. `[0]` — приоритетный. */
  suggestedCategories: string[];
  /** Сырой ответ провайдера до нормализации — только для отладки (DEBUG_VOICE). */
  raw?: string;
}

export abstract class TransactionParser {
  /**
   * @param text          распознанный текст траты, напр. "300 рублей кофе"
   * @param categoryTitles названия существующих категорий пользователя
   */
  abstract parse(
    text: string,
    categoryTitles: string[],
  ): Promise<ParsedTransaction>;
}
