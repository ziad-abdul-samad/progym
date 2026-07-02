ALTER TYPE "CoachSubscriptionAction" ADD VALUE IF NOT EXISTS 'ENDED';

CREATE TYPE "WorkoutLogSource" AS ENUM ('GENERAL_LIBRARY', 'COACH_PLAN');

ALTER TABLE "MemberProfile" ADD COLUMN "dateOfBirth" DATE;
UPDATE "MemberProfile"
SET "dateOfBirth" = (CURRENT_DATE - make_interval(years => "age"))::date;
ALTER TABLE "MemberProfile" ALTER COLUMN "dateOfBirth" SET NOT NULL;
ALTER TABLE "MemberProfile" DROP COLUMN "age";

ALTER TABLE "AttendanceRecord"
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidedById" TEXT,
ADD COLUMN "voidReason" TEXT;

ALTER TABLE "AttendanceRecord"
ADD CONSTRAINT "AttendanceRecord_voidedById_fkey"
FOREIGN KEY ("voidedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AttendanceRecord_voidedAt_idx" ON "AttendanceRecord"("voidedAt");

ALTER TABLE "WorkoutPlan"
ADD COLUMN "seriesId" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
UPDATE "WorkoutPlan" SET "seriesId" = "id";
ALTER TABLE "WorkoutPlan" ALTER COLUMN "seriesId" SET NOT NULL;
CREATE INDEX "WorkoutPlan_seriesId_version_idx" ON "WorkoutPlan"("seriesId", "version");

ALTER TABLE "NutritionPlan"
ADD COLUMN "seriesId" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
UPDATE "NutritionPlan" SET "seriesId" = "id";
ALTER TABLE "NutritionPlan" ALTER COLUMN "seriesId" SET NOT NULL;
CREATE INDEX "NutritionPlan_seriesId_version_idx" ON "NutritionPlan"("seriesId", "version");

ALTER TABLE "CoachRequest"
ADD COLUMN "requiredPhotoTypes" "ProgressPhotoType"[] NOT NULL DEFAULT ARRAY['FRONT', 'SIDE', 'BACK']::"ProgressPhotoType"[],
ADD COLUMN "submittedPhotoTypes" "ProgressPhotoType"[] NOT NULL DEFAULT ARRAY[]::"ProgressPhotoType"[];

CREATE TABLE "WorkoutLog" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planItemId" TEXT,
    "exerciseId" TEXT,
    "source" "WorkoutLogSource" NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "setsCompleted" INTEGER,
    "repsCompleted" TEXT,
    "load" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkoutLog"
ADD CONSTRAINT "WorkoutLog_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutLog"
ADD CONSTRAINT "WorkoutLog_planItemId_fkey"
FOREIGN KEY ("planItemId") REFERENCES "WorkoutPlanItem"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkoutLog"
ADD CONSTRAINT "WorkoutLog_exerciseId_fkey"
FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "WorkoutLog_memberId_performedAt_idx" ON "WorkoutLog"("memberId", "performedAt");
CREATE INDEX "WorkoutLog_planItemId_performedAt_idx" ON "WorkoutLog"("planItemId", "performedAt");
CREATE INDEX "WorkoutLog_exerciseId_performedAt_idx" ON "WorkoutLog"("exerciseId", "performedAt");

CREATE UNIQUE INDEX "Subscription_one_current_per_member"
ON "Subscription"("memberId")
WHERE "status" IN ('PENDING', 'ACTIVE', 'FROZEN');
