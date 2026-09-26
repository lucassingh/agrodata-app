-- CreateEnum
CREATE TYPE "VatCondition" AS ENUM ('RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "vatCondition" "VatCondition" NOT NULL DEFAULT 'RESPONSABLE_INSCRIPTO';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "vatRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "supplies" ADD COLUMN     "vatRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "cost_allocations" ADD COLUMN     "vatRate" DOUBLE PRECISION;

