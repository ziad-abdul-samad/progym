CREATE TABLE "MemberProfileChangeRequest" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "stagedAvatarId" TEXT,
    "requestedData" JSONB NOT NULL,
    "status" "CoachProfileChangeStatus" NOT NULL DEFAULT 'PENDING',
    "reviewReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberProfileChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MemberProfileChangeRequest_memberId_status_createdAt_idx"
ON "MemberProfileChangeRequest"("memberId", "status", "createdAt");

CREATE INDEX "MemberProfileChangeRequest_status_createdAt_idx"
ON "MemberProfileChangeRequest"("status", "createdAt");

ALTER TABLE "MemberProfileChangeRequest"
ADD CONSTRAINT "MemberProfileChangeRequest_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MemberProfileChangeRequest"
ADD CONSTRAINT "MemberProfileChangeRequest_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
