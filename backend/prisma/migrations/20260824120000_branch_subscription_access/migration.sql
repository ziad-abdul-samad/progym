-- Keep every rejected branch scan visible to the destination reception without
-- creating a false attendance record or modifying existing member data.
CREATE TABLE "DeniedEntryAttempt" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "source" "AttendanceSource" NOT NULL DEFAULT 'QR',
    "denialCode" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeniedEntryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeniedEntryAttempt_branchId_attemptedAt_idx" ON "DeniedEntryAttempt"("branchId", "attemptedAt");
CREATE INDEX "DeniedEntryAttempt_memberId_attemptedAt_idx" ON "DeniedEntryAttempt"("memberId", "attemptedAt");

ALTER TABLE "DeniedEntryAttempt" ADD CONSTRAINT "DeniedEntryAttempt_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeniedEntryAttempt" ADD CONSTRAINT "DeniedEntryAttempt_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeniedEntryAttempt" ADD CONSTRAINT "DeniedEntryAttempt_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
