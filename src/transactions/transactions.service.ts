/// <reference types="multer" />
import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const NEXARA_TRANSCRIBE_URL =
  'https://api.nexara.ru/api/v1/audio/transcriptions';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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
   * Голосовой ввод траты. Сейчас реализован Шаг 1 цепочки: аудио → текст
   * через Nexara. Шаг 2 (LLM: текст → JSON) и Шаг 3 (сохранение в БД) —
   * следующие под-блоки Этапа 3. Пока возвращаем распознанный текст.
   */
  async createFromVoice(userId: number, file: Express.Multer.File) {
    const text = await this.transcribe(file);
    return { userId, text };
  }

  /**
   * Шаг 1: отправляет аудиобуфер в Nexara и возвращает распознанный текст.
   * Файл приходит из multer в memory storage, поэтому доступен как Buffer
   * в `file.buffer`. Nexara API-совместима с OpenAI Whisper.
   */
  private async transcribe(file: Express.Multer.File): Promise<string> {
    const apiKey = this.config.get<string>('NEXARA_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'NEXARA_API_KEY не задан в окружении',
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
    } catch {
      // Сеть упала / таймаут — внешний сервис недоступен.
      throw new ServiceUnavailableException('Сервис распознавания недоступен');
    }

    if (!res.ok) {
      const detail = await res.text();
      throw new BadGatewayException(`Nexara вернула ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as { text?: string };
    if (!data.text) {
      throw new BadGatewayException('Nexara вернула пустой ответ');
    }
    return data.text;
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
