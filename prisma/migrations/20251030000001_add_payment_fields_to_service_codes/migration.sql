-- AlterTable
ALTER TABLE "service_codes" ADD COLUMN "approved" BOOLEAN,
ADD COLUMN "payment_run_code" TEXT,
ADD COLUMN "cps_claim_number" INTEGER,
ADD COLUMN "fee_submitted" DOUBLE PRECISION,
ADD COLUMN "approved_billing_code_id" INTEGER,
ADD COLUMN "fee_approved" DOUBLE PRECISION,
ADD COLUMN "total_premium_amount" DOUBLE PRECISION,
ADD COLUMN "program_payment" DOUBLE PRECISION,
ADD COLUMN "total_paid_amount" DOUBLE PRECISION,
ADD COLUMN "paid_number_of_units" INTEGER,
ADD COLUMN "paid_location_of_service" TEXT;

-- CreateIndex
CREATE INDEX "service_codes_approved_billing_code_id_idx" ON "service_codes"("approved_billing_code_id");

-- AddForeignKey
ALTER TABLE "service_codes" ADD CONSTRAINT "service_codes_approved_billing_code_id_fkey" FOREIGN KEY ("approved_billing_code_id") REFERENCES "billing_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

