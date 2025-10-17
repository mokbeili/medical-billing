-- CreateTable
CREATE TABLE "provider_holidays" (
    "id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_holidays_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "provider_holidays_provider_id_idx" ON "provider_holidays"("provider_id");

-- CreateIndex
CREATE INDEX "provider_holidays_date_idx" ON "provider_holidays"("date");

-- AddForeignKey
ALTER TABLE "provider_holidays" ADD CONSTRAINT "provider_holidays_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;