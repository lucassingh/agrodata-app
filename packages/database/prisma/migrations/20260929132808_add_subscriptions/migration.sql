-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('CAMPO', 'ASESOR', 'EMPRESA');

-- CreateTable
CREATE TABLE "subscriptions" (
    "userId" TEXT NOT NULL,
    "plan" "PlanType",
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "paidUntil" TIMESTAMP(3),
    "requestedPlan" "PlanType",
    "requestedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Toda persona que ya existía arranca la prueba gratis de 14 días al pasar esta migración.
INSERT INTO "subscriptions" ("userId", "trialEndsAt", "updatedAt")
SELECT "id", CURRENT_TIMESTAMP + INTERVAL '14 days', CURRENT_TIMESTAMP FROM "users";
