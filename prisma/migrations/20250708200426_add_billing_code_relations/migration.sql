-- CreateTable
CREATE TABLE "billing_code_relations" (
    "id" SERIAL NOT NULL,
    "previous_code_id" INTEGER NOT NULL,
    "next_code_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_code_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_code_relations_previous_code_id_idx" ON "billing_code_relations"("previous_code_id");

-- CreateIndex
CREATE INDEX "billing_code_relations_next_code_id_idx" ON "billing_code_relations"("next_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_code_relations_previous_code_id_next_code_id_key" ON "billing_code_relations"("previous_code_id", "next_code_id");

-- AddForeignKey
ALTER TABLE "billing_code_relations" ADD CONSTRAINT "billing_code_relations_previous_code_id_fkey" FOREIGN KEY ("previous_code_id") REFERENCES "billing_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_code_relations" ADD CONSTRAINT "billing_code_relations_next_code_id_fkey" FOREIGN KEY ("next_code_id") REFERENCES "billing_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
