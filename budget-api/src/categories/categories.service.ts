import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { normalizeCategoryTitle } from './normalize-title';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number) {
    const categories = await this.prisma.category.findMany({
      where: { userId },
      orderBy: { title: 'asc' },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    return categories.map(({ _count, ...category }) => ({
      ...category,
      transactionCount: _count.transactions,
    }));
  }

  async create(userId: number, dto: CreateCategoryDto) {
    const title = normalizeCategoryTitle(dto.title);
    try {
      return await this.prisma.category.create({
        data: {
          title,
          user: { connect: { id: userId } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`Category "${title}" already exists`);
      }
      throw error;
    }
  }

  async remove(userId: number, id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    if (!category || category.userId !== userId) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    const transactionCount = category._count.transactions;
    if (transactionCount > 0) {
      throw new ConflictException(
        `Category "${category.title}" is used by ${transactionCount} transactions and cannot be deleted`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
  }
}
