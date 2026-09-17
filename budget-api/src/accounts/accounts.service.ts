import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateAccountDto } from './dto/create-account.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Список счетов пользователя по алфавиту, с числом привязанных транзакций. */
  async findAll(userId: number) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { title: 'asc' },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    return accounts.map(({ _count, ...account }) => ({
      ...account,
      transactionCount: _count.transactions,
    }));
  }

  /**
   * Создание счёта. Первый счёт пользователя сразу становится дефолтным —
   * иначе после заведения единственного счёта дефолта не было бы вообще.
   * Считаем и создаём внутри `$transaction`, чтобы два одновременных запроса
   * не создали два «первых» счёта с isDefault = true.
   */
  async create(userId: number, dto: CreateAccountDto) {
    const title = dto.title.trim();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.account.count({ where: { userId } });
        return tx.account.create({
          data: {
            title,
            isDefault: existing === 0,
            user: { connect: { id: userId } },
          },
        });
      });
    } catch (error) {
      // P2002 — нарушение @@unique([userId, title]): такой счёт уже есть.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`Account "${title}" already exists`);
      }
      throw error;
    }
  }

  /**
   * Сделать счёт дефолтным. Снятие флага со старого и простановка новому —
   * одна неделимая операция: инвариант «ровно один дефолт» держится кодом,
   * в БД такого ограничения нет.
   */
  async setDefault(userId: number, id: number) {
    await this.assertOwned(userId, id);

    const [, account] = await this.prisma.$transaction([
      this.prisma.account.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.account.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return account;
  }

  /**
   * Удаление счёта. Удалять можно любой, включая дефолтный: транзакциям
   * удалённого счёта Postgres сам проставит accountId = null (onDelete:
   * SetNull в схеме), данные не искажаем.
   *
   * Если удалили дефолтный — дефолтным становится первый по алфавиту из
   * оставшихся; не осталось ни одного — дефолта просто нет.
   */
  async remove(userId: number, id: number) {
    const account = await this.assertOwned(userId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.account.delete({ where: { id } });

      if (!account.isDefault) return;

      const next = await tx.account.findFirst({
        where: { userId },
        orderBy: { title: 'asc' },
      });
      if (next) {
        await tx.account.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    });
  }

  /** Счёт существует и принадлежит этому пользователю — иначе 404. */
  private async assertOwned(userId: number, id: number) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId },
    });
    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }
    return account;
  }
}
