-- CreateEnum
CREATE TYPE "FarmActivity" AS ENUM ('AGRICULTURA', 'GANADERIA', 'TAMBO');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "activities" "FarmActivity"[] DEFAULT ARRAY[]::"FarmActivity"[];


-- Los campos existentes pasan de rubro a actividades.
UPDATE "tenants" SET "activities" = CASE "category"
  WHEN 'FIELD_AGRICOLA' THEN ARRAY['AGRICULTURA']::"FarmActivity"[]
  WHEN 'GANADERO' THEN ARRAY['GANADERIA']::"FarmActivity"[]
  WHEN 'TAMBO' THEN ARRAY['TAMBO']::"FarmActivity"[]
  ELSE ARRAY['AGRICULTURA', 'GANADERIA', 'TAMBO']::"FarmActivity"[]
END;
