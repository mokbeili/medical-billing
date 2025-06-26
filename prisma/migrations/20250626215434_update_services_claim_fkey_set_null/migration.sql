-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_claim_id_fkey";

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "billing_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
