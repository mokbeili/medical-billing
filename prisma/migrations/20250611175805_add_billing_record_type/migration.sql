-- AlterTable
ALTER TABLE "billing_code_change_logs" ADD COLUMN     "billing_record_type" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "billing_codes" ADD COLUMN     "billing_record_type" INTEGER NOT NULL DEFAULT 50;
