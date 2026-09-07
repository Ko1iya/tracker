-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "autoConfirmAt" TIMESTAMP(3),
ADD COLUMN     "suggestedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
