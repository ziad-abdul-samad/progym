CREATE TYPE "CoachProfileChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "NutritionMeal"
ADD COLUMN "timing" TEXT;

CREATE TABLE "CoachProfileChangeRequest" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "requestedData" JSONB NOT NULL,
    "status" "CoachProfileChangeStatus" NOT NULL DEFAULT 'PENDING',
    "reviewReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfileChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoachProfileChangeRequest_coachId_status_createdAt_idx"
ON "CoachProfileChangeRequest"("coachId", "status", "createdAt");

CREATE INDEX "CoachProfileChangeRequest_status_createdAt_idx"
ON "CoachProfileChangeRequest"("status", "createdAt");

ALTER TABLE "CoachProfileChangeRequest"
ADD CONSTRAINT "CoachProfileChangeRequest_coachId_fkey"
FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachProfileChangeRequest"
ADD CONSTRAINT "CoachProfileChangeRequest_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
