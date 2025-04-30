-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'SENT', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "billing_claims" (
    "id" TEXT NOT NULL,
    "friendly_id" TEXT NOT NULL,
    "physician_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "jurisdiction_id" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "openai_embedding" TEXT NOT NULL,
    "openai_suggestions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_claim_codes" (
    "id" SERIAL NOT NULL,
    "claim_id" TEXT NOT NULL,
    "code_id" INTEGER NOT NULL,
    "status" "ClaimStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_claim_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_claims_friendly_id_key" ON "billing_claims"("friendly_id");

-- AddForeignKey
ALTER TABLE "billing_claims" ADD CONSTRAINT "billing_claims_physician_id_fkey" FOREIGN KEY ("physician_id") REFERENCES "physicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_claims" ADD CONSTRAINT "billing_claims_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_claims" ADD CONSTRAINT "billing_claims_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_claim_codes" ADD CONSTRAINT "billing_claim_codes_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "billing_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_claim_codes" ADD CONSTRAINT "billing_claim_codes_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "billing_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
