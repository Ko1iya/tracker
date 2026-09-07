/*
  Warnings:

  - A unique constraint covering the columns `[userId,title]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_title_key" ON "Category"("userId", "title");
