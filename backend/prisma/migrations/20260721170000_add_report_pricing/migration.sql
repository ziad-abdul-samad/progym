ALTER TABLE "GymSettings"
ADD COLUMN "monthlySubscriptionPriceMinor" INTEGER NOT NULL DEFAULT 2500,
ADD COLUMN "membershipCurrency" TEXT NOT NULL DEFAULT 'USD';

INSERT INTO "Payment" (
  "id",
  "subscriptionId",
  "receivedById",
  "amountMinor",
  "currency",
  "method",
  "status",
  "paidAt",
  "notes",
  "createdAt",
  "updatedAt"
)
SELECT
  'historic_' || md5(subscription."id"),
  subscription."id",
  NULL,
  GREATEST(1, ROUND(2500 * GREATEST(1, EXTRACT(EPOCH FROM (subscription."endsAt" - subscription."startsAt")) / 86400) / 30.0))::INTEGER,
  'USD',
  'CASH'::"PaymentMethod",
  'PAID'::"PaymentStatus",
  subscription."startsAt",
  'Historical subscription amount calculated automatically at migration',
  subscription."createdAt",
  subscription."createdAt"
FROM "Subscription" AS subscription
WHERE NOT EXISTS (
  SELECT 1 FROM "Payment" AS payment WHERE payment."subscriptionId" = subscription."id"
);
