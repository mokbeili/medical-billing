/*
  Warnings:

  - Made the column `number_of_units` on table `service_codes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "billing_code_change_logs" ADD COLUMN     "interpretation_component_price" TEXT,
ADD COLUMN     "technical_and_interpretation_component_price" TEXT,
ADD COLUMN     "technical_component_price" TEXT;

-- AlterTable
ALTER TABLE "billing_codes" ADD COLUMN     "interpretation_component_price" TEXT,
ADD COLUMN     "technical_and_interpretation_component_price" TEXT,
ADD COLUMN     "technical_component_price" TEXT;

-- AlterTable
ALTER TABLE "service_codes" ALTER COLUMN "number_of_units" SET NOT NULL;
