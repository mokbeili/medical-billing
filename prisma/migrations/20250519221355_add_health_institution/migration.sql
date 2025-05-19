-- AlterTable
ALTER TABLE "billing_claims" ADD COLUMN     "health_institution_id" INTEGER;

-- CreateTable
CREATE TABLE "health_institutions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "phone_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_institutions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "billing_claims" ADD CONSTRAINT "billing_claims_health_institution_id_fkey" FOREIGN KEY ("health_institution_id") REFERENCES "health_institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
