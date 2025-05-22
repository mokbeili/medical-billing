-- CreateTable
CREATE TABLE "search_query_logs" (
    "id" SERIAL NOT NULL,
    "search_string" TEXT NOT NULL,
    "embeddings" TEXT NOT NULL,
    "results" TEXT NOT NULL,
    "jurisdiction_id" INTEGER NOT NULL,
    "physician_id" TEXT,
    "billing_claim_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_query_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "search_query_logs" ADD CONSTRAINT "search_query_logs_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_query_logs" ADD CONSTRAINT "search_query_logs_physician_id_fkey" FOREIGN KEY ("physician_id") REFERENCES "physicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_query_logs" ADD CONSTRAINT "search_query_logs_billing_claim_id_fkey" FOREIGN KEY ("billing_claim_id") REFERENCES "billing_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
