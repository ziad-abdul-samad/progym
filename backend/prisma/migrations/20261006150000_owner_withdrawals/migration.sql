-- Additive cash-movement ledger. No historical users, payments or expenses are rewritten.
CREATE TABLE "OwnerWithdrawal" (
  "id" TEXT PRIMARY KEY,
  "branchId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "ownerNameSnapshot" TEXT NOT NULL,
  "usdMinor" INTEGER NOT NULL DEFAULT 0,
  "sypNewMinor" INTEGER NOT NULL DEFAULT 0,
  "withdrawnAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),
  "voidedById" TEXT,
  "voidReason" TEXT,
  CONSTRAINT "OwnerWithdrawal_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OwnerWithdrawal_amounts_check" CHECK ("usdMinor" >= 0 AND "sypNewMinor" >= 0 AND ("usdMinor" > 0 OR "sypNewMinor" > 0)),
  CONSTRAINT "OwnerWithdrawal_owner_check" CHECK (length(trim("ownerNameSnapshot")) >= 2),
  CONSTRAINT "OwnerWithdrawal_void_check" CHECK (
    ("voidedAt" IS NULL AND "voidedById" IS NULL AND "voidReason" IS NULL) OR
    ("voidedAt" IS NOT NULL AND "voidedById" IS NOT NULL AND length(trim("voidReason")) >= 3)
  )
);
CREATE UNIQUE INDEX "OwnerWithdrawal_requestKey_key" ON "OwnerWithdrawal"("requestKey");
CREATE INDEX "OwnerWithdrawal_branchId_withdrawnAt_idx" ON "OwnerWithdrawal"("branchId", "withdrawnAt");
