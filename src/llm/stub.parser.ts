import { Injectable, Logger } from '@nestjs/common';
import {
  ParsedTransaction,
  ParsedTransactionType,
  TransactionParser,
} from './transaction-parser';

/**
 * Заглушка парсера на время, пока не выбран LLM-провайдер. Не ходит в сеть,
 * а извлекает данные простой эвристикой — чтобы можно было гонять весь
 * pending-флоу (создание траты, предложение категории, авто-подтверждение)
 * без реальной модели. Заменяется на боевой парсер подменой `useClass`
 * в `LlmModule`.
 */
@Injectable()
export class StubTransactionParser extends TransactionParser {
  private readonly logger = new Logger(StubTransactionParser.name);

  // Слова-маркеры дохода. Всё остальное считаем расходом.
  private static readonly INCOME_HINTS = ['зарплата', 'доход', 'премия', 'аванс'];

  parse(text: string, categoryTitles: string[]): Promise<ParsedTransaction> {
    this.logger.warn(
      `StubTransactionParser: реальный LLM не подключён, парсю эвристикой. text="${text}"`,
    );

    const amount = this.extractAmount(text);
    const type = this.detectType(text);
    const category = this.matchCategory(text, categoryTitles);

    const parsed: ParsedTransaction = {
      amount,
      currency: 'RUB',
      description: this.capitalize(text.trim()),
      type,
      category,
      // Заглушка не выдумывает осмысленных категорий: если совпадения нет,
      // предлагаем единственный запасной вариант, чтобы pending-флоу сработал.
      suggestedCategories: category === null ? ['Прочее'] : [],
    };
    parsed.raw = `stub: ${JSON.stringify(parsed)}`;
    return Promise.resolve(parsed);
  }

  /** Первое число в тексте; если не нашли — 0 (трату всё равно создадим). */
  private extractAmount(text: string): number {
    const match = text.replace(',', '.').match(/\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  private detectType(text: string): ParsedTransactionType {
    const lower = text.toLowerCase();
    return StubTransactionParser.INCOME_HINTS.some((hint) =>
      lower.includes(hint),
    )
      ? 'INCOME'
      : 'EXPENSE';
  }

  /** Ищет среди категорий пользователя ту, чьё название встречается в тексте. */
  private matchCategory(text: string, categoryTitles: string[]): string | null {
    const lower = text.toLowerCase();
    return (
      categoryTitles.find((title) => lower.includes(title.toLowerCase())) ??
      null
    );
  }

  private capitalize(text: string): string {
    return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
  }
}
