/*
  Warnings:

  - Added the required column `service_location` to the `service_codes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "service_codes" ADD COLUMN     "bilateral_indicator" TEXT,
ADD COLUMN     "claim_type" TEXT,
ADD COLUMN     "number_of_units" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "service_location" TEXT NOT NULL,
ADD COLUMN     "special_circumstances" TEXT;
