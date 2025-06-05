-- CreateTable
CREATE TABLE "billing_code_change_logs" (
    "id" SERIAL NOT NULL,
    "billing_code_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "code_class" TEXT,
    "anes" TEXT,
    "details" TEXT,
    "general_practice_cost" TEXT,
    "specialist_price" TEXT,
    "referred_price" TEXT,
    "non_referred_price" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_code_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_code_change_logs_billing_code_id_idx" ON "billing_code_change_logs"("billing_code_id");

-- AddForeignKey
ALTER TABLE "billing_code_change_logs" ADD CONSTRAINT "billing_code_change_logs_billing_code_id_fkey" FOREIGN KEY ("billing_code_id") REFERENCES "billing_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
