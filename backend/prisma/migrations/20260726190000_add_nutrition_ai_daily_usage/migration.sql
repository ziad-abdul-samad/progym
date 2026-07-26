CREATE TABLE "NutritionAiDailyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usageDate" DATE NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionAiDailyUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NutritionAiDailyUsage_userId_usageDate_key"
ON "NutritionAiDailyUsage"("userId", "usageDate");

CREATE INDEX "NutritionAiDailyUsage_usageDate_idx"
ON "NutritionAiDailyUsage"("usageDate");

ALTER TABLE "NutritionAiDailyUsage"
ADD CONSTRAINT "NutritionAiDailyUsage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
