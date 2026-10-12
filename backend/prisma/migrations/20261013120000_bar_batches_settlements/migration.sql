-- Keep all existing cash history; legacy handovers have no inferred bar allocation.
ALTER TABLE "OwnerWithdrawal" ADD COLUMN "barUsdMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "barSypNewMinor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OwnerWithdrawal" ADD CONSTRAINT "OwnerWithdrawal_bar_amounts_check"
  CHECK ("barUsdMinor">=0 AND "barUsdMinor"<="usdMinor" AND "barSypNewMinor">=0 AND "barSypNewMinor"<="sypNewMinor");
CREATE UNIQUE INDEX "OwnerWithdrawal_id_branchId_key" ON "OwnerWithdrawal"(id,"branchId");
CREATE UNIQUE INDEX "BarSale_id_branchId_key" ON "BarSale"(id,"branchId");
CREATE TABLE "BarSaleBatch" (
  id TEXT PRIMARY KEY,"branchId" TEXT NOT NULL,"requestKey" TEXT NOT NULL,
  payload JSONB NOT NULL,"createdById" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("branchId") REFERENCES "Branch"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BarSaleBatch_requestKey_key" ON "BarSaleBatch"("requestKey");
CREATE UNIQUE INDEX "BarSaleBatch_id_branchId_key" ON "BarSaleBatch"(id,"branchId");
ALTER TABLE "BarSale" ADD COLUMN "batchId" TEXT;
ALTER TABLE "BarSale" ADD CONSTRAINT "BarSale_batchId_branchId_fkey" FOREIGN KEY ("batchId","branchId")
  REFERENCES "BarSaleBatch"(id,"branchId") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "BarSettlement" (
  id TEXT PRIMARY KEY,"branchId" TEXT NOT NULL,"saleId" TEXT NOT NULL,"withdrawalId" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL CHECK ("amountMinor">0),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("branchId") REFERENCES "Branch"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("saleId","branchId") REFERENCES "BarSale"(id,"branchId") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("withdrawalId","branchId") REFERENCES "OwnerWithdrawal"(id,"branchId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BarSettlement_withdrawalId_saleId_key" ON "BarSettlement"("withdrawalId","saleId");
CREATE INDEX "BarSettlement_branchId_saleId_idx" ON "BarSettlement"("branchId","saleId");
CREATE INDEX "BarSettlement_saleId_idx" ON "BarSettlement"("saleId");
CREATE FUNCTION "protectBarAllocation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Bar allocation/batch history is immutable';
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "BarSettlement_history" BEFORE UPDATE OR DELETE ON "BarSettlement"
  FOR EACH ROW EXECUTE FUNCTION "protectBarAllocation"();
CREATE TRIGGER "BarSaleBatch_history" BEFORE UPDATE OR DELETE ON "BarSaleBatch"
  FOR EACH ROW EXECUTE FUNCTION "protectBarAllocation"();
CREATE FUNCTION "validateBarAllocation"() RETURNS trigger AS $$
DECLARE s "BarSale"%ROWTYPE; w "OwnerWithdrawal"%ROWTYPE; paid BIGINT; withdrawn BIGINT; permitted BIGINT;
BEGIN
  SELECT * INTO s FROM "BarSale" WHERE id=NEW."saleId" FOR UPDATE;
  SELECT * INTO w FROM "OwnerWithdrawal" WHERE id=NEW."withdrawalId";
  IF s.id IS NULL OR w.id IS NULL OR s."branchId"<>NEW."branchId" OR w."branchId"<>NEW."branchId"
    OR s."voidedAt" IS NOT NULL OR w."voidedAt" IS NOT NULL
    OR s."soldAt">=w."withdrawnAt"+interval '1 day' THEN
    RAISE EXCEPTION 'Invalid bar settlement branch/date/status';
  END IF;
  SELECT COALESCE(SUM(a."amountMinor"),0) INTO paid FROM "BarSettlement" a
    JOIN "OwnerWithdrawal" d ON d.id=a."withdrawalId" WHERE a."saleId"=s.id AND d."voidedAt" IS NULL;
  SELECT COALESCE(SUM(a."amountMinor"),0) INTO withdrawn FROM "BarSettlement" a
    JOIN "BarSale" x ON x.id=a."saleId" WHERE a."withdrawalId"=w.id AND x.currency=s.currency;
  permitted := CASE WHEN s.currency='USD' THEN w."barUsdMinor" ELSE w."barSypNewMinor" END;
  IF paid+NEW."amountMinor">s."amountMinor" OR withdrawn+NEW."amountMinor">permitted THEN
    RAISE EXCEPTION 'Bar settlement exceeds actual sale or handover allocation';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "BarSettlement_validate" BEFORE INSERT ON "BarSettlement"
  FOR EACH ROW EXECUTE FUNCTION "validateBarAllocation"();
CREATE FUNCTION "protectSettledBarSale"() RETURNS trigger AS $$
BEGIN
  IF OLD."voidedAt" IS NULL AND NEW."voidedAt" IS NOT NULL AND EXISTS (
    SELECT 1 FROM "BarSettlement" a JOIN "OwnerWithdrawal" w ON w.id=a."withdrawalId"
      WHERE a."saleId"=OLD.id AND w."voidedAt" IS NULL
  ) THEN RAISE EXCEPTION 'Correct owner handover before voiding settled sale'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "BarSale_settled_void" BEFORE UPDATE ON "BarSale"
  FOR EACH ROW EXECUTE FUNCTION "protectSettledBarSale"();
CREATE FUNCTION "protectOwnerHandoverHistory"() RETURNS trigger AS $$
BEGIN
  IF (to_jsonb(NEW)-ARRAY['voidedAt','voidedById','voidReason']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['voidedAt','voidedById','voidReason']) OR OLD."voidedAt" IS NOT NULL
  THEN RAISE EXCEPTION 'Owner handover history is immutable; correct using documented void'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "OwnerWithdrawal_history" BEFORE UPDATE ON "OwnerWithdrawal"
  FOR EACH ROW EXECUTE FUNCTION "protectOwnerHandoverHistory"();
