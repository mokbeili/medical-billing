/*
  Warnings:

  - You are about to drop the column `billing_claim_id` on the `search_query_logs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "search_query_logs" DROP CONSTRAINT "search_query_logs_billing_claim_id_fkey";

-- AlterTable
ALTER TABLE "search_query_logs" DROP COLUMN "billing_claim_id";