-- CreateEnum
CREATE TYPE "LivestockEventType" AS ENUM ('BIRTH', 'PURCHASE', 'SALE', 'DEATH', 'TRANSFER_IN', 'TRANSFER_OUT');

-- AlterEnum
ALTER TYPE "RecordType" ADD VALUE 'ANIMAL_DEATH';

-- CreateTable
CREATE TABLE "livestock_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pastureId" TEXT,
    "type" "LivestockEventType" NOT NULL,
    "animalType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalKg" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "currency" "CurrencyType",
    "counterparty" TEXT,
    "recordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livestock_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "livestock_events_tenantId_type_date_idx" ON "livestock_events"("tenantId", "type", "date");

-- AddForeignKey
ALTER TABLE "livestock_events" ADD CONSTRAINT "livestock_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestock_events" ADD CONSTRAINT "livestock_events_pastureId_fkey" FOREIGN KEY ("pastureId") REFERENCES "pastures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

