-- Catalog audiences affect future selection only. Preserve all receipt snapshots,
-- subscriptions, credentials and shifts. The owner can edit audiences afterwards.
CREATE TYPE "PlanAudience" AS ENUM ('MEN', 'WOMEN');
ALTER TABLE "MembershipPlan" ADD COLUMN "audience" "PlanAudience" NOT NULL DEFAULT 'MEN';
ALTER TABLE "ShiftObserver" ADD COLUMN "audience" "PlanAudience" NOT NULL DEFAULT 'MEN';

UPDATE "MembershipPlan" SET "audience" = 'WOMEN', "updatedAt" = CURRENT_TIMESTAMP
WHERE id IN ('b1_women_monthly_2026', 'b1_women_daily_2026', 'b1_women_half_2026')
   OR "nameAr" ~ '(سيدات|نساء|نسائي)' OR "nameEn" ~* '\m(women|ladies)\M';

UPDATE "ShiftObserver" SET "audience" = 'WOMEN', "updatedAt" = CURRENT_TIMESTAMP
WHERE "seedKey" IN ('b1:women:shift:1', 'b1:women:shift:2', 'b2:shift:3', 'b3:shift:3');

-- Owner confirmed the same current branch prices for women's B2/B3 offers.
-- Copy the current catalog once, including owner price edits, without repricing history.
INSERT INTO "MembershipPlan" ("id", "branchId", "nameAr", "nameEn", "descriptionAr", "descriptionEn",
 "durationDays", "priceMinor", "currency", "features", "isActive", "audience", "sortOrder", "updatedAt")
SELECT p.id || '_women_20261001', p."branchId", 'سيدات — ' || p."nameAr", 'Women — ' || p."nameEn",
 p."descriptionAr", p."descriptionEn", p."durationDays", p."priceMinor", p."currency", p."features",
 p."isActive", 'WOMEN'::"PlanAudience", p."sortOrder", CURRENT_TIMESTAMP
FROM "MembershipPlan" p JOIN "Branch" b ON b.id = p."branchId"
WHERE b.code IN ('b2','b3') AND p."audience" = 'MEN' AND p."deletedAt" IS NULL
ON CONFLICT ("id") DO NOTHING;
