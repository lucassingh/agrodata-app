-- CreateTable
CREATE TABLE "tours_seen" (
    "userId" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tours_seen_pkey" PRIMARY KEY ("userId","tourId")
);

-- AddForeignKey
ALTER TABLE "tours_seen" ADD CONSTRAINT "tours_seen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
