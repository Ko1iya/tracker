export class CreateTransactionDto {
  amount: number;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  userId: number;
}
