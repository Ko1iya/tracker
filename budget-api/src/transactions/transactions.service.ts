/// <reference types="multer" />
import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionParser } from '../llm/transaction-parser';
import { normalizeCategoryTitle } from '../categories/normalize-title';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// Сколько ждём решения пользователя по категории, прежде чем крон
// авто-подтвердит предложение LLM.
const AUTO_CONFIRM_DELAY_MS = 5 * 60 * 1000;

const NEXARA_TRANSCRIBE_URL =
  'https://api.nexara.ru/api/v1/audio/transcriptions';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly parser: TransactionParser,
  ) {}

  async create(userId: number, dto: CreateTransactionDto) {
    if (dto.categoryId !== undefined) {
      await this.assertCategoryOwned(userId, dto.categoryId);
    }
    return this.prisma.transaction.create({
      data: {
        amount: dto.amount,
        description: dto.description,
        type: dto.type,
        user: { connect: { id: userId } },
        ...(dto.categoryId !== undefined && {
          category: { connect: { id: dto.categoryId } },
        }),
      },
    });
  }

  findAll(userId: number, limit?: number, offset?: number) {
    const take = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const skip = Math.max(offset ?? 0, 0);

    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take,
      skip,
    });
  }

  async findOne(userId: number, id: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with id ${id} not found`);
    }
    return transaction;
  }

  async update(userId: number, id: number, dto: UpdateTransactionDto) {
    if (dto.categoryId !== undefined) {
      await this.assertCategoryOwned(userId, dto.categoryId);
    }
    const result = await this.prisma.transaction.updateMany({
      where: { id, userId },
      data: dto,
    });
    if (result.count === 0) {
      throw new NotFoundException(`Transaction with id ${id} not found`);
    }
    return this.prisma.transaction.findUnique({ where: { id } });
  }

  async remove(userId: number, id: number) {
    try {
      const result = await this.prisma.transaction.deleteMany({
        where: { id, userId },
      });
      if (result.count === 0) {
        throw new NotFoundException(`Transaction with id ${id} not found`);
      }
      return { id };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Transaction with id ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Голосовой ввод траты, вся цепочка Этапа 3:
   *  1. аудио → текст (Nexara, `transcribe`);
   *  2. текст → структура (LLM через `TransactionParser`);
   *  3. сохранение в БД.
   *
   * Трата создаётся сразу — сумма и тип уже известны. Если LLM сопоставил
   * категорию с существующей у пользователя, привязываем её сразу. Иначе
   * транзакция остаётся без категории и получает дедлайн `autoConfirmAt`:
   * до него пользователь может уточнить категорию через
   * `PATCH /transactions/:id/category`, после — крон подставит предложение LLM.
   */
  async createFromVoice(userId: number, file: Express.Multer.File) {
    const text = await this.transcribe(file);

    const categories = await this.prisma.category.findMany({
      where: { userId },
      select: { id: true, title: true },
    });
    const categoryTitles = categories.map((c) => c.title);
    const parsed = await this.parser.parse(text, categoryTitles);

    // Отладка голосового ввода (включается флагом DEBUG_VOICE). Помогает понять,
    // почему выбрана та или иная категория: видны транскрипт, какие категории
    // переданы в LLM и её сырой ответ. В БД эти данные не пишутся.
    const debugEnabled = this.config.get<string>('DEBUG_VOICE') === 'true';
    if (debugEnabled) {
      this.logger.debug(
        `voice | transcript="${text}" | categories=[${categoryTitles.join(', ')}] | llmRaw=${parsed.raw ?? '(нет)'}`,
      );
    }

    // Защита от «пустой» надиктовки.
    if (!(parsed.amount > 0)) {
      throw new UnprocessableEntityException(
        'Не разобрал сумму траты. Назови её вслух, например: «кофе 200 рублей».',
      );
    }

    // Сопоставляем название категории от LLM с категорией пользователя.
    const matched =
      parsed.category === null
        ? undefined
        : categories.find(
            (c) => c.title.toLowerCase() === parsed.category!.toLowerCase(),
          );

    const transaction = await this.prisma.transaction.create({
      data: {
        amount: parsed.amount,
        currency: parsed.currency,
        description: parsed.description,
        type: parsed.type,
        user: { connect: { id: userId } },
        ...(matched
          ? { category: { connect: { id: matched.id } } }
          : {
              suggestedCategories: parsed.suggestedCategories,
              autoConfirmAt: new Date(Date.now() + AUTO_CONFIRM_DELAY_MS),
            }),
      },
    });

    const response = this.withPendingFlag(transaction);
    if (debugEnabled) {
      return {
        ...response,
        _debug: {
          transcript: text,
          categories: categoryTitles,
          llmRaw: parsed.raw ?? null,
        },
      };
    }
    return response;
  }

  /**
   * Пользователь уточняет категорию pending-транзакции (или меняет уже
   * проставленную). Категория ищется-или-создаётся по названию через `upsert`
   * — это покрывает и «принять предложение LLM», и «ввести свою новую/старую».
   * После привязки гасим дедлайн авто-подтверждения.
   */
  async setCategory(userId: number, id: number, categoryName: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with id ${id} not found`);
    }

    const title = normalizeCategoryTitle(categoryName);
    const category = await this.prisma.category.upsert({
      where: { userId_title: { userId, title } },
      create: { title, user: { connect: { id: userId } } },
      update: {},
    });

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        category: { connect: { id: category.id } },
        suggestedCategories: [],
        autoConfirmAt: null,
      },
    });
    return this.withPendingFlag(updated);
  }

  /**
   * Фоновое авто-подтверждение. Вызывается кроном (см. `transactions.cron.ts`).
   * Берёт все транзакции с истёкшим `autoConfirmAt`, подставляет первый
   * вариант из `suggestedCategories` (создавая категорию при необходимости) и
   * гасит дедлайн. Возвращает число обработанных записей — для лога.
   */
  async autoConfirmPending(): Promise<number> {
    const due = await this.prisma.transaction.findMany({
      where: { autoConfirmAt: { lte: new Date() } },
    });

    for (const tx of due) {
      const suggestion = tx.suggestedCategories[0];
      if (suggestion) {
        await this.setCategory(tx.userId, tx.id, suggestion);
      } else {
        // Предлагать нечего — просто снимаем транзакцию с ожидания.
        await this.prisma.transaction.update({
          where: { id: tx.id },
          data: { autoConfirmAt: null },
        });
      }
    }
    return due.length;
  }

  /** Добавляет к ответу вычисляемый флаг — категория ещё ожидает решения. */
  private withPendingFlag<T extends { autoConfirmAt: Date | null }>(tx: T) {
    return { ...tx, categoryPending: tx.autoConfirmAt !== null };
  }

  /**
   * Шаг 1: отправляет аудиобуфер в Nexara и возвращает распознанный текст.
   * Файл приходит из multer в memory storage, поэтому доступен как Buffer
   * в `file.buffer`. Nexara API-совместима с OpenAI Whisper.
   */
  private async transcribe(file: Express.Multer.File): Promise<string> {
    const apiKey = this.config.get<string>('NEXARA_API_KEY');
    if (!apiKey) {
      this.logger.error('NEXARA_API_KEY не задан в окружении');
      throw new InternalServerErrorException(
        'Не удалось обработать запись. Попробуйте позже.',
      );
    }

    // Buffer → Blob → FormData. Имя файла важно: по расширению Nexara
    // определяет формат аудио.
    const form = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype,
    });
    form.append('file', blob, file.originalname);

    let res: Response;
    try {
      res = await fetch(NEXARA_TRANSCRIBE_URL, {
        method: 'POST',
        // Content-Type не ставим вручную — fetch сам проставит boundary
        // для multipart/form-data.
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } catch (error) {
      // Сеть упала / таймаут — внешний сервис недоступен.
      this.logger.error(`Nexara недоступна: ${String(error)}`);
      throw new ServiceUnavailableException(
        'Сервис временно недоступен. Попробуйте позже.',
      );
    }

    if (!res.ok) {
      const detail = await res.text();
      this.logger.error(`Nexara вернула ${res.status}: ${detail}`);
      throw new BadGatewayException(
        'Не удалось распознать запись. Попробуйте ещё раз.',
      );
    }

    const data = (await res.json()) as { text?: string };

    const text = data.text?.trim();
    if (!text) {
      this.logger.error('Nexara вернула пустой ответ');
      throw new BadGatewayException(
        'Не удалось распознать речь. Запишите ещё раз чуть чётче.',
      );
    }
    return text;
  }

  private async assertCategoryOwned(userId: number, categoryId: number) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) {
      throw new NotFoundException(`Category with id ${categoryId} not found`);
    }
  }
}
