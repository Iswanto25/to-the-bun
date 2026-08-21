/*
  Warnings:

  - You are about to drop the column `createdAt` on the `logs` table. All the data in the column will be lost.
  - The `date` column on the `logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `ip` column on the `logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `availableActions` column on the `resource` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `grantedActions` column on the `rolePermission` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[number]` on the table `module` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[number,moduleId]` on the table `resource` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `number` to the `module` table without a default value. This is not possible if the table is not empty.
  - Added the required column `number` to the `resource` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Action" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'DETAIL', 'LIST', 'IMPORT', 'EXPORT', 'ASSIGN', 'REVOKE');

-- AlterTable
ALTER TABLE "logs" DROP COLUMN "createdAt",
ADD COLUMN     "reqId" TEXT,
DROP COLUMN "date",
ADD COLUMN     "date" TIMESTAMP(3),
DROP COLUMN "ip",
ADD COLUMN     "ip" INET;

-- AlterTable
ALTER TABLE "module" ADD COLUMN     "number" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "resource" ADD COLUMN     "number" INTEGER NOT NULL,
DROP COLUMN "availableActions",
ADD COLUMN     "availableActions" "Action"[];

-- AlterTable
ALTER TABLE "rolePermission" DROP COLUMN "grantedActions",
ADD COLUMN     "grantedActions" "Action"[];

-- CreateIndex
CREATE INDEX "logs_date_idx" ON "logs"("date");

-- CreateIndex
CREATE INDEX "logs_reqId_idx" ON "logs"("reqId");

-- CreateIndex
CREATE UNIQUE INDEX "module_number_key" ON "module"("number");

-- CreateIndex
CREATE INDEX "module_number_idx" ON "module"("number");

-- CreateIndex
CREATE INDEX "resource_moduleId_idx" ON "resource"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "resource_number_moduleId_key" ON "resource"("number", "moduleId");

-- CreateIndex
CREATE INDEX "user_roleId_idx" ON "user"("roleId");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");
