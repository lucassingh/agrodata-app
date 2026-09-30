-- CreateTable
CREATE TABLE "access_invites" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "demoRequestId" TEXT,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_invites_token_key" ON "access_invites"("token");

-- CreateIndex
CREATE INDEX "access_invites_demoRequestId_idx" ON "access_invites"("demoRequestId");

-- CreateIndex
CREATE INDEX "access_invites_email_idx" ON "access_invites"("email");
