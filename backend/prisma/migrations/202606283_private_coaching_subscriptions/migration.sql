CREATE TYPE "CoachPlanRequirement" AS ENUM ('EITHER', 'WORKOUT', 'NUTRITION', 'BOTH');
CREATE TYPE "CoachSubscriptionAction" AS ENUM ('ADDED', 'STARTED', 'RENEWED', 'DEACTIVATED', 'EXPIRED');

ALTER TABLE "CoachAssignment"
ALTER COLUMN "status" SET DEFAULT 'PAUSED',
ADD COLUMN "coachingStartsAt" TIMESTAMP(3),
ADD COLUMN "coachingEndsAt" TIMESTAMP(3),
ADD COLUMN "planRequirement" "CoachPlanRequirement" NOT NULL DEFAULT 'EITHER',
ADD COLUMN "reminderEnabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "CoachAssignment"
SET
  "coachingStartsAt" = "startedAt",
  "coachingEndsAt" = "startedAt" + INTERVAL '30 days'
WHERE "status" = 'ACTIVE';

CREATE INDEX "CoachAssignment_status_coachingEndsAt_idx"
ON "CoachAssignment"("status", "coachingEndsAt");

CREATE TABLE "CoachSubscriptionEvent" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "action" "CoachSubscriptionAction" NOT NULL,
    "days" INTEGER,
    "previousEndsAt" TIMESTAMP(3),
    "newEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachSubscriptionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoachSubscriptionEvent_assignmentId_createdAt_idx"
ON "CoachSubscriptionEvent"("assignmentId", "createdAt");
CREATE INDEX "CoachSubscriptionEvent_memberId_createdAt_idx"
ON "CoachSubscriptionEvent"("memberId", "createdAt");
CREATE INDEX "CoachSubscriptionEvent_coachId_createdAt_idx"
ON "CoachSubscriptionEvent"("coachId", "createdAt");
CREATE INDEX "CoachSubscriptionEvent_action_createdAt_idx"
ON "CoachSubscriptionEvent"("action", "createdAt");

ALTER TABLE "CoachSubscriptionEvent"
ADD CONSTRAINT "CoachSubscriptionEvent_assignmentId_fkey"
FOREIGN KEY ("assignmentId") REFERENCES "CoachAssignment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachSubscriptionEvent"
ADD CONSTRAINT "CoachSubscriptionEvent_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachSubscriptionEvent"
ADD CONSTRAINT "CoachSubscriptionEvent_coachId_fkey"
FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
