-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('OWNER', 'FARM_MANAGER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('ADMIN', 'USER_GENERAL');

-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('AGRONOMO', 'VETERINARIO', 'PRODUCTOR', 'ADMINISTRATIVO', 'OTRO');

-- CreateEnum
CREATE TYPE "TenantCategory" AS ENUM ('FIELD_AGRICOLA', 'GANADERO', 'TAMBO', 'MIXTO');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('SEEDING', 'ANIMAL_BIRTH', 'POTRERO_CHANGE', 'PURCHASE', 'SALE', 'FUMIGATION', 'FUEL_USAGE', 'EXPENSE_INVOICE', 'TASK_COMPLETED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TRATAMIENTO_SANITARIO', 'ORDEN_SIEMBRA', 'PULVERIZACION', 'FERTILIZACION');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SupplyCategoryType" AS ENUM ('ALIMENTO', 'SANIDAD', 'INSUMOS_AGRICOLAS', 'FERTILIZANTES');

-- CreateEnum
CREATE TYPE "CurrencyType" AS ENUM ('ARS', 'USD');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "baseCurrency" TEXT NOT NULL DEFAULT 'ARS',
    "category" "TenantCategory" NOT NULL DEFAULT 'MIXTO',
    "location" TEXT,
    "totalHa" DOUBLE PRECISION,
    "mapFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT,
    "wNumber" TEXT,
    "passwordHash" TEXT,
    "profileType" "ProfileType" NOT NULL DEFAULT 'OTRO',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'OPERATOR',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "activeTenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_pending_invites" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "SystemRole" NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "email" TEXT,
    "wNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "consumedUserId" TEXT,

    CONSTRAINT "tenant_pending_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tenant_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "SystemRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "specialty" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "RecordType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "rawMessage" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hectares" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pasture_crops" (
    "id" TEXT NOT NULL,
    "pastureId" TEXT NOT NULL,
    "crop" TEXT NOT NULL,
    "hectares" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),

    CONSTRAINT "pasture_crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pasture_animals" (
    "id" TEXT NOT NULL,
    "pastureId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "animalType" TEXT NOT NULL,
    "averageWeight" DOUBLE PRECISION,

    CONSTRAINT "pasture_animals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "deadline" TIMESTAMP(3) NOT NULL,
    "treatment" TEXT,
    "crop" TEXT,
    "genetic" TEXT,
    "spacing" TEXT,
    "density" TEXT,
    "densityUnit" TEXT,
    "contractor" TEXT,
    "description" TEXT,
    "responsibleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_products" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "dosis" TEXT,
    "unit" TEXT,

    CONSTRAINT "task_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_pastures" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "pastureId" TEXT NOT NULL,
    "hectares" TEXT,

    CONSTRAINT "task_pastures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_animals" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "animalType" TEXT NOT NULL,

    CONSTRAINT "task_animals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_fertilizers" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "dosis" TEXT,
    "unit" TEXT,

    CONSTRAINT "task_fertilizers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3F8C3C',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "CurrencyType" NOT NULL DEFAULT 'ARS',
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "withIva" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "cost" DOUBLE PRECISION,
    "currency" "CurrencyType" NOT NULL DEFAULT 'ARS',
    "supplier" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "animal_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rodeos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rodeos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crop_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "tenantId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_wNumber_key" ON "users"("wNumber");

-- CreateIndex
CREATE INDEX "tenant_pending_invites_tenantId_idx" ON "tenant_pending_invites"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_pending_invites_email_idx" ON "tenant_pending_invites"("email");

-- CreateIndex
CREATE INDEX "tenant_pending_invites_wNumber_idx" ON "tenant_pending_invites"("wNumber");

-- CreateIndex
CREATE INDEX "verification_codes_userId_code_idx" ON "verification_codes"("userId", "code");

-- CreateIndex
CREATE INDEX "user_tenant_memberships_tenantId_role_idx" ON "user_tenant_memberships"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenant_memberships_userId_tenantId_key" ON "user_tenant_memberships"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "records_tenantId_type_occurredAt_idx" ON "records"("tenantId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "pastures_tenantId_idx" ON "pastures"("tenantId");

-- CreateIndex
CREATE INDEX "tasks_tenantId_status_idx" ON "tasks"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tasks_tenantId_type_idx" ON "tasks"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_tenantId_name_key" ON "expense_categories"("tenantId", "name");

-- CreateIndex
CREATE INDEX "expenses_tenantId_date_idx" ON "expenses"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "supply_categories_tenantId_name_key" ON "supply_categories"("tenantId", "name");

-- CreateIndex
CREATE INDEX "supplies_tenantId_categoryId_idx" ON "supplies"("tenantId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "animal_categories_tenantId_name_key" ON "animal_categories"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "rodeos_tenantId_name_key" ON "rodeos"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "crop_configs_tenantId_name_key" ON "crop_configs"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "supply_configs_tenantId_name_key" ON "supply_configs"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "expense_configs_tenantId_name_key" ON "expense_configs"("tenantId", "name");

-- CreateIndex
CREATE INDEX "webhook_events_channel_createdAt_idx" ON "webhook_events"("channel", "createdAt");

-- AddForeignKey
ALTER TABLE "tenant_pending_invites" ADD CONSTRAINT "tenant_pending_invites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_pending_invites" ADD CONSTRAINT "tenant_pending_invites_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenant_memberships" ADD CONSTRAINT "user_tenant_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenant_memberships" ADD CONSTRAINT "user_tenant_memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastures" ADD CONSTRAINT "pastures_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasture_crops" ADD CONSTRAINT "pasture_crops_pastureId_fkey" FOREIGN KEY ("pastureId") REFERENCES "pastures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasture_animals" ADD CONSTRAINT "pasture_animals_pastureId_fkey" FOREIGN KEY ("pastureId") REFERENCES "pastures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_products" ADD CONSTRAINT "task_products_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_pastures" ADD CONSTRAINT "task_pastures_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_pastures" ADD CONSTRAINT "task_pastures_pastureId_fkey" FOREIGN KEY ("pastureId") REFERENCES "pastures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_animals" ADD CONSTRAINT "task_animals_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_fertilizers" ADD CONSTRAINT "task_fertilizers_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_categories" ADD CONSTRAINT "supply_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "supply_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_categories" ADD CONSTRAINT "animal_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rodeos" ADD CONSTRAINT "rodeos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_configs" ADD CONSTRAINT "crop_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_configs" ADD CONSTRAINT "supply_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_configs" ADD CONSTRAINT "supply_configs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "supply_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_configs" ADD CONSTRAINT "expense_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
