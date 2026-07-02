ALTER TABLE "Exercise"
ADD COLUMN "trainingDay" INTEGER;

CREATE INDEX "Exercise_trainingDay_isActive_idx"
ON "Exercise"("trainingDay", "isActive");
