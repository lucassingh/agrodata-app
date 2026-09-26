-- CreateEnum
CREATE TYPE "ReproEventType" AS ENUM ('SERVICE_START', 'PREGNANCY_CHECK', 'CALVING', 'WEANING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RecordType" ADD VALUE 'WEIGHING';
ALTER TYPE "RecordType" ADD VALUE 'REPRODUCTION';
ALTER TYPE "RecordType" ADD VALUE 'MILK_PRODUCTION';
ALTER TYPE "RecordType" ADD VALUE 'MILK_SETTLEMENT';

-- CreateTable
CREATE TABLE "weighings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pastureId" TEXT,
    "animalType" TEXT NOT NULL,
    "rodeoId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "headCount" INTEGER NOT NULL,
    "averageKg" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "recordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weighings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repro_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rodeoId" TEXT,
    "animalType" TEXT,
    "type" "ReproEventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "females" INTEGER,
    "pregnant" INTEGER,
    "empty" INTEGER,
    "births" INTEGER,
    "weaned" INTEGER,
    "recordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repro_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milk_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "cowsMilking" INTEGER,
    "cowsDry" INTEGER,
    "recordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milk_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milk_settlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "dairy" TEXT,
    "liters" DOUBLE PRECISION NOT NULL,
    "fatPct" DOUBLE PRECISION,
    "proteinPct" DOUBLE PRECISION,
    "pricePerLiter" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" "CurrencyType" NOT NULL DEFAULT 'ARS',
    "recordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milk_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weighings_tenantId_pastureId_animalType_date_idx" ON "weighings"("tenantId", "pastureId", "animalType", "date");

-- CreateIndex
CREATE INDEX "repro_events_tenantId_date_idx" ON "repro_events"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "milk_records_tenantId_date_key" ON "milk_records"("tenantId", "date");

-- CreateIndex
CREATE INDEX "milk_settlements_tenantId_periodEnd_idx" ON "milk_settlements"("tenantId", "periodEnd");

-- AddForeignKey
ALTER TABLE "weighings" ADD CONSTRAINT "weighings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weighings" ADD CONSTRAINT "weighings_pastureId_fkey" FOREIGN KEY ("pastureId") REFERENCES "pastures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weighings" ADD CONSTRAINT "weighings_rodeoId_fkey" FOREIGN KEY ("rodeoId") REFERENCES "rodeos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repro_events" ADD CONSTRAINT "repro_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repro_events" ADD CONSTRAINT "repro_events_rodeoId_fkey" FOREIGN KEY ("rodeoId") REFERENCES "rodeos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milk_records" ADD CONSTRAINT "milk_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milk_settlements" ADD CONSTRAINT "milk_settlements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

