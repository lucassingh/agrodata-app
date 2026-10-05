-- CreateTable
CREATE TABLE "user_report_logos" (
    "userId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_report_logos_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "user_report_logos" ADD CONSTRAINT "user_report_logos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
