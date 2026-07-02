ALTER TABLE "WorkoutPlanItem"
ADD COLUMN "dayTitle" TEXT;

ALTER TABLE "NutritionPlan"
ADD COLUMN "targetMode" TEXT,
ADD COLUMN "targetCalories" INTEGER,
ADD COLUMN "targetProteinG" DECIMAL(7, 2),
ADD COLUMN "targetCarbsG" DECIMAL(7, 2),
ADD COLUMN "targetFatG" DECIMAL(7, 2);
