/*
  Warnings:

  - You are about to drop the column `physician_id` on the `search_query_logs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "search_query_logs" DROP CONSTRAINT "search_query_logs_physician_id_fkey";

-- AlterTable
ALTER TABLE "search_query_logs" DROP COLUMN "physician_id",
ADD COLUMN     "physicianId" TEXT,
ADD COLUMN     "user_id" INTEGER;

-- AddForeignKey
ALTER TABLE "search_query_logs" ADD CONSTRAINT "search_query_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_query_logs" ADD CONSTRAINT "search_query_logs_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "physicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
