import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

@Injectable()
export class TransactionsService {
  // Внедряем PrismaService через конструктор
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    // Логика сохранения в БД
    return await this.prisma.transaction.create({
      data: {
        amount: createTransactionDto.amount,
        description: createTransactionDto.description,
        type: createTransactionDto.type,
        user: {
          connect: { id: createTransactionDto.userId }, // Связываем с пользователем
        },
      },
    });
  }

  async findAll(limit?: number, offset?: number) {
    // Нормализуем пагинацию: limit в диапазоне [1..MAX_LIMIT], offset >= 0
    const take = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const skip = Math.max(offset ?? 0, 0);

    return await this.prisma.transaction.findMany({
      orderBy: { date: 'desc' },
      take,
      skip,
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  async remove(id: number) {
    try {
      return await this.prisma.transaction.delete({ where: { id } });
    } catch (error) {
      // Prisma бросает P2025, если записи нет — превращаем в 404
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Transaction with id ${id} not found`);
      }
      throw error;
    }
  }
}
