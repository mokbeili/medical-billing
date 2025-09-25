
-- AlterTable
ALTER TABLE "services" ADD COLUMN     "billing_type_id" INTEGER;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_billing_type_id_fkey" FOREIGN KEY ("billing_type_id") REFERENCES "billing_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

