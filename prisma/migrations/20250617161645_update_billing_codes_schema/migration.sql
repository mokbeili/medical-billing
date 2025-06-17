/*
  Warnings:

  - You are about to alter the column `title` on the `billing_code_change_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(256)`.
  - You are about to alter the column `title` on the `billing_codes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(256)`.

*/
-- AlterTable
ALTER TABLE "billing_code_change_logs" ALTER COLUMN "title" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "low_fee" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "high_fee" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "technical_fee" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "billing_codes" ALTER COLUMN "title" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "low_fee" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "high_fee" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "technical_fee" SET DATA TYPE DOUBLE PRECISION;
