-- CreateEnum
CREATE TYPE "ServiceCodeChangeType" AS ENUM ('INSERT', 'DELETE', 'UPDATE', 'ROUND');

-- CreateTable
CREATE TABLE "service_code_change_logs" (
    "id" SERIAL NOT NULL,
    "service_code_id" INTEGER NOT NULL,
    "change_type" "ServiceCodeChangeType" NOT NULL,
    "previous_data" TEXT,
    "new_data" TEXT,
    "changed_by" INTEGER,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "service_code_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_code_change_logs_service_code_id_idx" ON "service_code_change_logs"("service_code_id");

-- CreateIndex
CREATE INDEX "service_code_change_logs_changed_at_idx" ON "service_code_change_logs"("changed_at");

-- CreateIndex
CREATE INDEX "service_code_change_logs_change_type_idx" ON "service_code_change_logs"("change_type");

-- AddForeignKey
ALTER TABLE "service_code_change_logs" ADD CONSTRAINT "service_code_change_logs_service_code_id_fkey" FOREIGN KEY ("service_code_id") REFERENCES "service_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_code_change_logs" ADD CONSTRAINT "service_code_change_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
