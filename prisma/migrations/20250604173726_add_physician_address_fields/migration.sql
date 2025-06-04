-- AlterTable
ALTER TABLE "physicians" ADD COLUMN     "city" TEXT,
ADD COLUMN     "group_number" TEXT,
ADD COLUMN     "health_institution_id" INTEGER,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "street_address" TEXT;

-- AddForeignKey
ALTER TABLE "physicians" ADD CONSTRAINT "physicians_health_institution_id_fkey" FOREIGN KEY ("health_institution_id") REFERENCES "health_institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
