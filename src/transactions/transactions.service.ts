import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: number, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        amount: dto.amount,
        description: dto.description,
        type: dto.type,
        user: { connect: { id: userId } },
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
}
