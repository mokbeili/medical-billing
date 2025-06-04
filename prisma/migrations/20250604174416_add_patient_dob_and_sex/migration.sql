/*
  Warnings:

  - Added the required column `date_of_birth` to the `patients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sex` to the `patients` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "date_of_birth" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "sex" TEXT NOT NULL;
