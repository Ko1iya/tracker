import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionsService } from './transactions.service';

/**
 * Фоновый воркер pending-транзакций. Раз в минуту проверяет, не истёк ли
 * дедлайн `autoConfirmAt` у трат, ожидающих уточнения категории, и
 * авто-подтверждает их предложением LLM. Логика — в `TransactionsService`;
 * здесь только расписание (разделяем фоновую задачу и HTTP-сервис).
 */
@Injectable()
export class TransactionsCron {
  private readonly logger = new Logger(TransactionsCron.name);

  constructor(private readonly transactions: TransactionsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async autoConfirmPending() {
    const count = await this.transactions.autoConfirmPending();
    if (count > 0) {
      this.logger.log(`Авто-подтверждено категорий: ${count}`);
    }
  }
}
