-- AlterTable
ALTER TABLE "service_codes" ADD COLUMN     "claim_number" INTEGER,
ADD COLUMN     "sequence" INTEGER;

-- CreateIndex
CREATE INDEX "service_codes_claim_number_idx" ON "service_codes"("claim_number");
