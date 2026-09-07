import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Тело PATCH /transactions/:id/category. Пользователь подтверждает категорию
 * для pending-транзакции: либо принимает предложение LLM, либо вводит своё
 * название (существующее или новое — сервер найдёт-или-создаст).
 */
export class SetCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  categoryName!: string;
}
