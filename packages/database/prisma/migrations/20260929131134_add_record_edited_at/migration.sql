-- AlterTable
ALTER TABLE "records" ADD COLUMN     "editedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "records_createdAt_idx" ON "records"("createdAt");
