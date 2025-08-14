-- AlterTable
ALTER TABLE "services" ADD COLUMN     "attending_physician_id" INTEGER,
ADD COLUMN     "family_physician_id" INTEGER,
ADD COLUMN     "visit_number" TEXT;

-- CreateIndex
CREATE INDEX "services_attending_physician_id_idx" ON "services"("attending_physician_id");

-- CreateIndex
CREATE INDEX "services_family_physician_id_idx" ON "services"("family_physician_id");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_attending_physician_id_fkey" FOREIGN KEY ("attending_physician_id") REFERENCES "referring_physicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_family_physician_id_fkey" FOREIGN KEY ("family_physician_id") REFERENCES "referring_physicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
