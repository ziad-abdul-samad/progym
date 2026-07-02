ALTER TABLE "AttendanceRecord"
DROP CONSTRAINT IF EXISTS "AttendanceRecord_memberId_attendanceDate_key";

CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_one_valid_per_member_day"
ON "AttendanceRecord"("memberId", "attendanceDate")
WHERE "voidedAt" IS NULL;

ALTER TABLE "WorkoutLog"
ADD COLUMN IF NOT EXISTS "completed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "isPersonalRecord" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutPlan_seriesId_version_key"
ON "WorkoutPlan"("seriesId", "version");

CREATE UNIQUE INDEX IF NOT EXISTS "NutritionPlan_seriesId_version_key"
ON "NutritionPlan"("seriesId", "version");
