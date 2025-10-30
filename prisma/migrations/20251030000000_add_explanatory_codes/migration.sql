-- CreateTable
CREATE TABLE "explanatory_codes" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "explanation" TEXT NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "explanatory_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_code_explanatory_codes" (
    "id" SERIAL NOT NULL,
    "service_code_id" INTEGER NOT NULL,
    "explanatory_code_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_code_explanatory_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "explanatory_codes_provider_id_idx" ON "explanatory_codes"("provider_id");

-- CreateIndex
CREATE INDEX "explanatory_codes_code_idx" ON "explanatory_codes"("code");

-- CreateIndex
CREATE INDEX "service_code_explanatory_codes_service_code_id_idx" ON "service_code_explanatory_codes"("service_code_id");

-- CreateIndex
CREATE INDEX "service_code_explanatory_codes_explanatory_code_id_idx" ON "service_code_explanatory_codes"("explanatory_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_code_explanatory_codes_service_code_id_explanatory_code_id_key" ON "service_code_explanatory_codes"("service_code_id", "explanatory_code_id");

-- AddForeignKey
ALTER TABLE "explanatory_codes" ADD CONSTRAINT "explanatory_codes_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_code_explanatory_codes" ADD CONSTRAINT "service_code_explanatory_codes_service_code_id_fkey" FOREIGN KEY ("service_code_id") REFERENCES "service_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_code_explanatory_codes" ADD CONSTRAINT "service_code_explanatory_codes_explanatory_code_id_fkey" FOREIGN KEY ("explanatory_code_id") REFERENCES "explanatory_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

