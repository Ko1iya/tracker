import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { normalizeCategoryTitle } from './normalize-title';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { title: 'asc' },
    });
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
}
