-- AlterTable
ALTER TABLE "billing_code_change_logs" ADD COLUMN     "day_range" INTEGER,
ADD COLUMN     "max_units" INTEGER;

-- AlterTable
ALTER TABLE "billing_codes" ADD COLUMN     "day_range" INTEGER,
ADD COLUMN     "max_units" INTEGER;
