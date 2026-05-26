import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ParsedTransaction,
  ParsedTransactionType,
  TransactionParser,
} from './transaction-parser';

const SYSTEM_INSTRUCTION = `Ты — парсер личных трат и доходов. На вход даётся текст на русском и список названий категорий пользователя. Верни СТРОГО JSON-объект по заданной схеме и ничего больше.

Правила:
- amount: число — сумма (только величина, без валюты).
- currency: ISO-код валюты. Если в тексте валюта не названа — "RUB".
- description: краткое человекочитаемое описание траты (1–3 слова, с заглавной буквы).
- type: "EXPENSE" для трат, "INCOME" для поступлений (зарплата, доход, премия, аванс и т.п.).
- category: выбери СТРОГО одно название из списка категорий пользователя, если оно ТЕМАТИЧЕСКИ подходит трате. Если подходящего нет — null.
- НЕ выбирай обобщённые категории-«корзины» ("Прочее", "Разное", "Другое", "Остальное" и т.п.) как совпадение, если трата явно тематическая (есть конкретный предмет/услуга). В таком случае ставь category = null и предложи конкретную категорию в suggestedCategories.
- suggestedCategories: если category === null, предложи 1–3 коротких НОВЫХ названия категории под эту трату (по-русски, с заглавной буквы). Если category заполнена — пустой массив.`;

/**
 * Боевой парсер на Google Gemini (модель из GEMINI_MODEL). Просит у модели
 * structured output по схеме ParsedTransaction (responseMimeType=json +
 * responseSchema), поэтому ответ гарантированно валидный JSON. Реализует ту же
 * абстракцию TransactionParser, что и заглушка — подключается подменой
 * useClass в LlmModule.
 *
 * Внешняя интеграция: Google Gemini API (@google/genai).
 */
@Injectable()
export class GeminiTransactionParser extends TransactionParser {
  private readonly logger = new Logger(GeminiTransactionParser.name);
  private readonly model: string;
  private readonly client: GoogleGenAI | null;

  constructor(config: ConfigService) {
    super();
    const apiKey = config.get<string>('GEMINI_API_KEY');
    this.model = config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    // Клиент создаём, только если ключ задан; иначе parse() бросит понятную 500.
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async parse(
    text: string,
    categoryTitles: string[],
  ): Promise<ParsedTransaction> {
    if (!this.client) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY не задан в окружении',
      );
    }

    const categoriesLine = categoryTitles.length
      ? categoryTitles.join(', ')
      : '(нет категорий)';
    const prompt = `Категории пользователя: ${categoriesLine}\nТекст траты: "${text}"`;

    let raw: string | undefined;
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'] },
              category: { type: Type.STRING, nullable: true },
              suggestedCategories: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'amount',
              'currency',
              'description',
              'type',
              'suggestedCategories',
            ],
          },
        },
      });
      raw = response.text;
    } catch (error) {
      this.logger.error(`Gemini API недоступна: ${String(error)}`);
      throw new ServiceUnavailableException('LLM-сервис недоступен');
    }

    if (!raw) {
      throw new BadGatewayException('Gemini вернула пустой ответ');
    }

    return this.normalize(raw);
  }

  /** Парсит и подстраховывает ответ модели до контракта ParsedTransaction. */
  private normalize(raw: string): ParsedTransaction {
    let data: Partial<ParsedTransaction>;
    try {
      data = JSON.parse(raw) as Partial<ParsedTransaction>;
    } catch {
      throw new BadGatewayException('Gemini вернула невалидный JSON');
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
