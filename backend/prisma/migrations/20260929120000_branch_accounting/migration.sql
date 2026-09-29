-- Additive rollout. Existing subscriptions and payment amounts are preserved.
ALTER TABLE "MembershipPlan" ADD COLUMN "branchId" TEXT;
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "MembershipPlan_branchId_isActive_sortOrder_idx" ON "MembershipPlan"("branchId", "isActive", "sortOrder");
ALTER TABLE "Payment"
 ADD COLUMN "requestKey" TEXT,
 ADD COLUMN "branchIdSnapshot" TEXT,
 ADD COLUMN "planIdSnapshot" TEXT,
 ADD COLUMN "planNameSnapshot" TEXT,
 ADD COLUMN "durationDaysSnapshot" INTEGER,
 ADD COLUMN "memberIdSnapshot" TEXT,
 ADD COLUMN "memberNameSnapshot" TEXT,
 ADD COLUMN "receiverNameSnapshot" TEXT,
 ADD COLUMN "observerNameSnapshot" TEXT;
CREATE UNIQUE INDEX "Payment_requestKey_key" ON "Payment"("requestKey");
CREATE INDEX "Payment_branchIdSnapshot_status_paidAt_idx" ON "Payment"("branchIdSnapshot", "status", "paidAt");
-- Only recover branch/member identity; do not guess a historical plan or price.
UPDATE "Payment" p SET "branchIdSnapshot" = s."branchId", "memberIdSnapshot" = s."memberId"
 FROM "Subscription" s WHERE s."id" = p."subscriptionId";
-- During a rolling deploy, an older instance can still insert a receipt.
-- Capture its branch/member identity without inventing the purchased plan.
CREATE FUNCTION "capturePaymentIdentity"() RETURNS trigger AS $$
BEGIN
 IF NEW."branchIdSnapshot" IS NULL OR NEW."memberIdSnapshot" IS NULL THEN
   SELECT s."branchId", s."memberId" INTO NEW."branchIdSnapshot", NEW."memberIdSnapshot"
   FROM "Subscription" s WHERE s.id = NEW."subscriptionId";
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Payment_capture_identity" BEFORE INSERT ON "Payment"
 FOR EACH ROW EXECUTE FUNCTION "capturePaymentIdentity"();
CREATE TABLE "Expense" (
 "id" TEXT PRIMARY KEY, "requestKey" TEXT NOT NULL, "branchId" TEXT NOT NULL,
 "title" TEXT NOT NULL, "notes" TEXT, "amountMinor" INTEGER NOT NULL,
 "currency" TEXT NOT NULL, "spentAt" TIMESTAMP(3) NOT NULL,
 "createdById" TEXT NOT NULL, "createdByName" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "voidedAt" TIMESTAMP(3), "voidedById" TEXT, "voidReason" TEXT,
 CONSTRAINT "Expense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "Expense_positive_amount" CHECK ("amountMinor" > 0),
 CONSTRAINT "Expense_currency" CHECK ("currency" IN ('USD', 'SYP_NEW'))
);
CREATE UNIQUE INDEX "Expense_requestKey_key" ON "Expense"("requestKey");
CREATE INDEX "Expense_branchId_spentAt_idx" ON "Expense"("branchId", "spentAt");
INSERT INTO "MembershipPlan" ("id","branchId","nameAr","nameEn","durationDays","priceMinor","currency","sortOrder","updatedAt")
SELECT v.id, b.id, v.ar, v.en, v.days, v.price, v.currency, v.sort, CURRENT_TIMESTAMP
FROM (VALUES
 ('b1_daily_2026','b1','دخول يوم واحد','Day pass',1,30000,'SYP_NEW',1),
 ('b1_monthly_2026','b1','اشتراك شهري','Monthly',30,3000,'USD',2),
 ('b2_daily_2026','b2','دخول يوم واحد','Day pass',1,30000,'SYP_NEW',1),
 ('b2_half_2026','b2','نصف شهر','Half month',15,140000,'SYP_NEW',2),
 ('b2_monthly_2026','b2','اشتراك شهري','Monthly',30,200000,'SYP_NEW',3),
 ('b2_military_2026','b2','اشتراك عسكري — شهر كامل','Military monthly',30,140000,'SYP_NEW',4),
 ('b3_daily_2026','b3','دخول يوم واحد','Day pass',1,30000,'SYP_NEW',1),
 ('b3_half_2026','b3','نصف شهر','Half month',15,175000,'SYP_NEW',2),
 ('b3_monthly_2026','b3','اشتراك شهري','Monthly',30,200000,'SYP_NEW',3)
) AS v(id,code,ar,en,days,price,currency,sort)
JOIN "Branch" b ON b.code=v.code
ON CONFLICT ("id") DO NOTHING;
