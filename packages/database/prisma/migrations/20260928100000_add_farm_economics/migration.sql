-- CreateEnum
CREATE TYPE "ExchangeRateKind" AS ENUM ('MAYORISTA', 'OFICIAL', 'BLUE', 'BOLSA', 'CONTADOCONLIQUI', 'CRIPTO', 'TARJETA');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('IN_PROGRESS', 'HARVESTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('GRAIN_SALE', 'OTHER');

-- AlterEnum
ALTER TYPE "RecordType" ADD VALUE 'HARVEST';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "exchangeRateKind" "ExchangeRateKind" NOT NULL DEFAULT 'MAYORISTA';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "exchangeRate" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "kind" "ExchangeRateKind" NOT NULL,
    "date" DATE NOT NULL,
    "buy" DOUBLE PRECISION NOT NULL,
    "sell" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pastureId" TEXT NOT NULL,
    "crop" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "hectares" DOUBLE PRECISION,
    "sowingDate" TIMESTAMP(3),
    "status" "CampaignStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "referencePrice" DOUBLE PRECISION,
    "notes" TEXT,
    "recordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_allocations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "expenseId" TEXT,
    "stockMovementId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "CurrencyType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "concept" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalKg" DOUBLE PRECISION NOT NULL,
    "moisture" DOUBLE PRECISION,
    "recordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "harvests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incomes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT,
    "type" "IncomeType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "crop" TEXT,
    "quantityKg" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "CurrencyType" NOT NULL,
    "exchangeRate" DOUBLE PRECISION,
    "counterparty" TEXT,
    "description" TEXT,
    "recordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_kind_date_key" ON "exchange_rates"("kind", "date");

-- CreateIndex
CREATE INDEX "campaigns_tenantId_season_idx" ON "campaigns"("tenantId", "season");

-- CreateIndex
CREATE INDEX "campaigns_pastureId_status_idx" ON "campaigns"("pastureId", "status");

-- CreateIndex
CREATE INDEX "cost_allocations_campaignId_idx" ON "cost_allocations"("campaignId");

-- CreateIndex
CREATE INDEX "cost_allocations_expenseId_idx" ON "cost_allocations"("expenseId");

-- CreateIndex
CREATE INDEX "cost_allocations_stockMovementId_idx" ON "cost_allocations"("stockMovementId");

-- CreateIndex
CREATE INDEX "harvests_campaignId_idx" ON "harvests"("campaignId");

-- CreateIndex
CREATE INDEX "incomes_tenantId_date_idx" ON "incomes"("tenantId", "date");

-- CreateIndex
CREATE INDEX "incomes_campaignId_idx" ON "incomes"("campaignId");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_pastureId_fkey" FOREIGN KEY ("pastureId") REFERENCES "pastures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocations" ADD CONSTRAINT "cost_allocations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocations" ADD CONSTRAINT "cost_allocations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocations" ADD CONSTRAINT "cost_allocations_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocations" ADD CONSTRAINT "cost_allocations_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "stock_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

