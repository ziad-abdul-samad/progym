-- Additive only: no changes to existing accounts, subscription amounts or expense amounts.
CREATE TYPE "ExpenseKind" AS ENUM ('GENERAL', 'SALARY');
CREATE TABLE "SalaryRecipient" (
  "id" TEXT PRIMARY KEY,
  "branchId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameKey" TEXT NOT NULL,
  "jobTitle" TEXT,
  "salaryMinor" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'SYP_NEW',
  "archivedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalaryRecipient_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SalaryRecipient_salaryMinor_check" CHECK ("salaryMinor" >= 0),
  CONSTRAINT "SalaryRecipient_currency_check" CHECK ("currency" IN ('USD','SYP_NEW'))
);
CREATE UNIQUE INDEX "SalaryRecipient_branchId_nameKey_key" ON "SalaryRecipient"("branchId","nameKey");
CREATE UNIQUE INDEX "SalaryRecipient_id_branchId_key" ON "SalaryRecipient"("id","branchId");
CREATE INDEX "SalaryRecipient_branchId_archivedAt_name_idx" ON "SalaryRecipient"("branchId","archivedAt","name");
ALTER TABLE "Expense"
  ADD COLUMN "kind" "ExpenseKind" NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN "salaryRecipientId" TEXT,
  ADD COLUMN "salaryNameSnapshot" TEXT,
  ADD COLUMN "salaryJobSnapshot" TEXT,
  ADD COLUMN "salaryMonth" TEXT;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_salaryRecipientId_branchId_fkey"
  FOREIGN KEY ("salaryRecipientId","branchId") REFERENCES "SalaryRecipient"("id","branchId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_salary_snapshot_check" CHECK (
  ("kind" = 'GENERAL' AND "salaryRecipientId" IS NULL AND "salaryNameSnapshot" IS NULL AND "salaryJobSnapshot" IS NULL AND "salaryMonth" IS NULL)
  OR ("kind" = 'SALARY' AND "salaryRecipientId" IS NOT NULL AND "salaryNameSnapshot" IS NOT NULL AND length(trim("salaryNameSnapshot")) > 0
    AND "salaryMonth" IS NOT NULL AND "salaryMonth" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);
CREATE INDEX "Expense_branchId_kind_spentAt_idx" ON "Expense"("branchId","kind","spentAt");
CREATE INDEX "Expense_salaryRecipientId_salaryMonth_voidedAt_idx" ON "Expense"("salaryRecipientId","salaryMonth","voidedAt");
