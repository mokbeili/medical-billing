-- AlterTable
ALTER TABLE "billing_claims" ADD COLUMN     "referring_physician_id" INTEGER;

-- AddForeignKey
ALTER TABLE "billing_claims" ADD CONSTRAINT "billing_claims_referring_physician_id_fkey" FOREIGN KEY ("referring_physician_id") REFERENCES "referring_physicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
