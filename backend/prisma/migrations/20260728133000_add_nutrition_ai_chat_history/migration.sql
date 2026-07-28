CREATE TYPE "NutritionAiMessageRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "NutritionAiMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "NutritionAiMessageRole" NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionAiMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NutritionAiMessage_userId_createdAt_id_idx"
ON "NutritionAiMessage"("userId", "createdAt", "id");

ALTER TABLE "NutritionAiMessage"
ADD CONSTRAINT "NutritionAiMessage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
