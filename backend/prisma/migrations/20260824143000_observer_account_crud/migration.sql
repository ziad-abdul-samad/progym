-- Observer profiles are retained as audit tombstones when their login account
-- is deleted. seedKey prevents fixed seed accounts from being recreated later.
ALTER TABLE "ShiftObserver" ADD COLUMN "seedKey" TEXT;
ALTER TABLE "ShiftObserver" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ShiftObserver_seedKey_key" ON "ShiftObserver"("seedKey");
CREATE INDEX "ShiftObserver_branchId_deletedAt_idx" ON "ShiftObserver"("branchId", "deletedAt");
