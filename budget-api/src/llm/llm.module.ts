import { Module } from '@nestjs/common';
import { TransactionParser } from './transaction-parser';
import { OpenRouterTransactionParser } from './openrouter.parser';

/**
 * Изолирует выбор LLM-провайдера за абстракцией `TransactionParser`.
 *
 * Сейчас провайдером подставлен `OpenRouterTransactionParser` (OpenRouter).
 * Для fallback из нескольких провайдеров заведи композитный парсер, который
 * сам перебирает их по очереди, и подставь его сюда — потребители
 * (TransactionsService) не заметят разницы, т.к. зависят только от абстракции.
 */
@Module({
  providers: [
    {
      provide: TransactionParser,
      useClass: OpenRouterTransactionParser,
    },
  ],
  exports: [TransactionParser],
})
export class LlmModule {}
