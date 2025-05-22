-- AlterTable
ALTER TABLE "search_query_logs" ADD COLUMN     "previous_log_id" INTEGER;

-- AddForeignKey
ALTER TABLE "search_query_logs" ADD CONSTRAINT "search_query_logs_previous_log_id_fkey" FOREIGN KEY ("previous_log_id") REFERENCES "search_query_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
