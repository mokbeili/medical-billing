-- AlterTable
ALTER TABLE "billing_claims" ADD COLUMN     "icd_code_id" INTEGER;

-- CreateTable
CREATE TABLE "icd_codes" (
    "id" SERIAL NOT NULL,
    "version" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "icd_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "icd_codes_code_idx" ON "icd_codes"("code");

-- AddForeignKey
ALTER TABLE "billing_claims" ADD CONSTRAINT "billing_claims_icd_code_id_fkey" FOREIGN KEY ("icd_code_id") REFERENCES "icd_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
