-- AlterTable
ALTER TABLE "billing_claims" ADD COLUMN     "batch_claim_text" TEXT;

-- AlterTable
ALTER TABLE "search_query_logs" ADD COLUMN     "billingClaimId" TEXT;

-- AddForeignKey
ALTER TABLE "search_query_logs" ADD CONSTRAINT "search_query_logs_billingClaimId_fkey" FOREIGN KEY ("billingClaimId") REFERENCES "billing_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
