import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ParsedTransaction,
  ParsedTransactionType,
  TransactionParser,
} from './transaction-parser';

const SYSTEM_INSTRUCTION = `Ты — парсер личных трат и доходов. На вход даётся текст на русском и список названий категорий пользователя. Верни СТРОГО JSON-объект и ничего больше (без markdown, без \`\`\`).

Форма JSON:
{
  "amount": число (только величина, без валюты),
  "currency": ISO-код валюты; если в тексте не названа — "RUB",
  "description": краткое описание траты (1–3 слова, с заглавной буквы),
  "type": "EXPENSE" для трат, "INCOME" для поступлений (зарплата, доход, премия, аванс и т.п.),
  "category": СТРОГО одно название из списка категорий пользователя, если оно ТЕМАТИЧЕСКИ подходит трате, иначе null,
  "suggestedCategories": массив строк
}

Правила:
- НЕ выбирай обобщённые категории-«корзины» ("Прочее", "Разное", "Другое", "Остальное" и т.п.) как совпадение, если трата явно тематическая (есть конкретный предмет/услуга). В таком случае ставь category = null и предложи конкретную категорию в suggestedCategories.
- suggestedCategories: если category === null, предложи 1–3 коротких НОВЫХ названия категории под эту трату (по-русски, с заглавной буквы). Если category заполнена — пустой массив.`;

/**
 * Боевой парсер на OpenRouter (модель из OPENROUTER_MODEL). Ходит в OpenRouter
 * через OpenAI SDK как drop-in замену (baseURL = https://openrouter.ai/api/v1):
 * OpenRouter совместим с OpenAI Chat Completions API. Просит у модели JSON-ответ
 * (response_format: json_object), затем normalize подстраховывает типы до
 * контракта ParsedTransaction. Реализует ту же абстракцию TransactionParser,
 * что и заглушка — подключается подменой useClass в LlmModule.
 *
 * Внешняя интеграция: OpenRouter API (openai SDK, OpenAI-совместимый эндпоинт).
 */
@Injectable()
export class OpenRouterTransactionParser extends TransactionParser {
  private readonly logger = new Logger(OpenRouterTransactionParser.name);
  private readonly model: string;
  private readonly client: OpenAI | null;

  constructor(config: ConfigService) {
    super();
    const apiKey = config.get<string>('OPENROUTER_API_KEY');
    this.model = config.get<string>('OPENROUTER_MODEL') ?? 'xiaomi/mimo-v2.5';
    // Клиент создаём, только если ключ задан; иначе parse() бросит понятную 500.
    this.client = apiKey
      ? new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' })
      : null;
  }

  async parse(
    text: string,
    categoryTitles: string[],
  ): Promise<ParsedTransaction> {
    if (!this.client) {
      throw new InternalServerErrorException(
        'OPENROUTER_API_KEY не задан в окружении',
      );
    }

    const categoriesLine = categoryTitles.length
      ? categoryTitles.join(', ')
      : '(нет категорий)';
    const prompt = `Категории пользователя: ${categoriesLine}\nТекст траты: "${text}"`;

    let raw: string | null | undefined;
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });
      raw = completion.choices[0]?.message?.content;
    } catch (error) {
      this.logger.error(`OpenRouter API недоступна: ${String(error)}`);
      throw new ServiceUnavailableException('LLM-сервис недоступен');
    }

    if (!raw) {
      throw new BadGatewayException('OpenRouter вернул пустой ответ');
    }

    return this.normalize(raw);
  }

  /** Парсит и подстраховывает ответ модели до контракта ParsedTransaction. */
  private normalize(raw: string): ParsedTransaction {
    let data: Partial<ParsedTransaction>;
    try {
      data = JSON.parse(raw) as Partial<ParsedTransaction>;
    } catch {
      throw new BadGatewayException('OpenRouter вернул невалидный JSON');
    }

    const type: ParsedTransactionType =
      data.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
    const category =
      typeof data.category === 'string' && data.category.length > 0
        ? data.category
        : null;

    return {
      amount: Number(data.amount) || 0,
      currency: data.currency ?? 'RUB',
      description: data.description ?? '',
      type,
      category,
      suggestedCategories: Array.isArray(data.suggestedCategories)
        ? data.suggestedCategories
        : [],
      raw,
    };
  }
}
