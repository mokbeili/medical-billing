-- CreateTable
CREATE TABLE "service_codes_totals" (
    "id" SERIAL NOT NULL,
    "service_code_id" INTEGER NOT NULL,
    "mode" TEXT,
    "total_line_type" TEXT,
    "fee_submitted" DOUBLE PRECISION,
    "fee_approved" DOUBLE PRECISION,
    "total_premium_amount" DOUBLE PRECISION,
    "total_program_payment" DOUBLE PRECISION,
    "total_paid_amount" DOUBLE PRECISION,
    "run_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_codes_totals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_codes_totals_service_code_id_idx" ON "service_codes_totals"("service_code_id");

-- AddForeignKey
ALTER TABLE "service_codes_totals" ADD CONSTRAINT "service_codes_totals_service_code_id_fkey" FOREIGN KEY ("service_code_id") REFERENCES "service_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

