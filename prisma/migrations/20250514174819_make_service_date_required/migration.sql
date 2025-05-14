/*
  Warnings:

  - Made the column `service_date` on table `billing_claims` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "billing_claims" ALTER COLUMN "service_date" SET NOT NULL;
