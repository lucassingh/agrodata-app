-- CreateEnum
CREATE TYPE "StockDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "StockMovementSource" AS ENUM ('INITIAL', 'MANUAL', 'EDIT', 'WHATSAPP');

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "direction" "StockDirection" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "currency" "CurrencyType",
    "source" "StockMovementSource" NOT NULL,
    "pastureId" TEXT,
    "recordId" TEXT,
    "userId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_movements_supplyId_date_idx" ON "stock_movements"("supplyId", "date");

-- CreateIndex
CREATE INDEX "stock_movements_tenantId_date_idx" ON "stock_movements"("tenantId", "date");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "supplies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_pastureId_fkey" FOREIGN KEY ("pastureId") REFERENCES "pastures"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Saldo de apertura: los insumos que ya tenían stock arrancan su historial con
-- un movimiento INITIAL por la cantidad actual, para que el saldo cierre.
INSERT INTO "stock_movements" ("id", "tenantId", "supplyId", "direction", "quantity", "balance", "unitCost", "currency", "source")
SELECT gen_random_uuid()::text, "tenantId", "id", 'IN', "quantity", "quantity", "cost", "currency", 'INITIAL'
FROM "supplies"
WHERE "quantity" > 0;
