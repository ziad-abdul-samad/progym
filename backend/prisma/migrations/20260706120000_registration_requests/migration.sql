CREATE TYPE "RegistrationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "RegistrationRequest" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "RegistrationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "observerId" TEXT,
    "requestedDays" INTEGER NOT NULL DEFAULT 30,
    "approvedDays" INTEGER,
    "reviewReason" TEXT,
    "claimTokenHash" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationRequest_memberId_key" ON "RegistrationRequest"("memberId");
CREATE UNIQUE INDEX "RegistrationRequest_claimTokenHash_key" ON "RegistrationRequest"("claimTokenHash");
CREATE INDEX "RegistrationRequest_status_createdAt_idx" ON "RegistrationRequest"("status", "createdAt");
CREATE INDEX "RegistrationRequest_reviewerId_reviewedAt_idx" ON "RegistrationRequest"("reviewerId", "reviewedAt");

ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_observerId_fkey"
FOREIGN KEY ("observerId") REFERENCES "ShiftObserver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
