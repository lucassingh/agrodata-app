-- AlterTable
ALTER TABLE "webhook_events" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_externalId_key" ON "webhook_events"("externalId");
