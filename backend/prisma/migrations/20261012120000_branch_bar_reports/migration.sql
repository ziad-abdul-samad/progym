-- Additive only; old amounts, catalog prices and financial rows are never rewritten.
ALTER TABLE "Payment" ADD COLUMN "planAudienceSnapshot" "PlanAudience";
CREATE TABLE "BarProduct" (
  "id" TEXT PRIMARY KEY,"branchId" TEXT NOT NULL,"name" TEXT NOT NULL,"nameKey" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SYP_NEW',"prices" JSONB NOT NULL,"isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BarProduct_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK ("currency" IN ('SYP_NEW','USD')), CHECK (jsonb_typeof("prices")='array' AND jsonb_array_length("prices") BETWEEN 1 AND 10)
);
CREATE UNIQUE INDEX "BarProduct_branchId_nameKey_key" ON "BarProduct"("branchId","nameKey");
CREATE UNIQUE INDEX "BarProduct_id_branchId_key" ON "BarProduct"("id","branchId");
CREATE INDEX "BarProduct_branchId_isActive_name_idx" ON "BarProduct"("branchId","isActive","name");
CREATE TABLE "BarSale" (
  "id" TEXT PRIMARY KEY,"branchId" TEXT NOT NULL,"productId" TEXT NOT NULL,"requestKey" TEXT NOT NULL,
  "productNameSnapshot" TEXT NOT NULL,"priceLabelSnapshot" TEXT NOT NULL,"quantity" INTEGER NOT NULL,
  "unitPriceMinor" INTEGER NOT NULL,"amountMinor" INTEGER NOT NULL,"currency" TEXT NOT NULL,"soldAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,"createdById" TEXT NOT NULL,"createdByName" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),"voidedById" TEXT,"voidReason" TEXT,
  CONSTRAINT "BarSale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BarSale_productId_branchId_fkey" FOREIGN KEY ("productId","branchId") REFERENCES "BarProduct"("id","branchId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK ("quantity" BETWEEN 1 AND 10000 AND "unitPriceMinor">=0 AND "amountMinor">=0 AND "quantity"::bigint*"unitPriceMinor"::bigint="amountMinor"),
  CHECK ("currency" IN ('SYP_NEW','USD'))
);
CREATE UNIQUE INDEX "BarSale_requestKey_key" ON "BarSale"("requestKey");
CREATE INDEX "BarSale_branchId_soldAt_idx" ON "BarSale"("branchId","soldAt");
CREATE TABLE "BarCashEntry" (
  "id" TEXT PRIMARY KEY,"branchId" TEXT NOT NULL,"requestKey" TEXT NOT NULL,"kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,"amountMinor" INTEGER NOT NULL,"currency" TEXT NOT NULL,"spentAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,"createdById" TEXT NOT NULL,"createdByName" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),"voidedById" TEXT,"voidReason" TEXT,
  CONSTRAINT "BarCashEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK ("kind" IN ('EXPENSE','OPENING')), CHECK ("amountMinor">=0 AND ("kind"='OPENING' OR "amountMinor">0)),
  CHECK ("currency" IN ('SYP_NEW','USD'))
);
CREATE UNIQUE INDEX "BarCashEntry_requestKey_key" ON "BarCashEntry"("requestKey");
CREATE INDEX "BarCashEntry_branchId_kind_spentAt_idx" ON "BarCashEntry"("branchId","kind","spentAt");
-- Immutable sale/cash snapshots: corrections can ONLY set the void fields once.
CREATE FUNCTION "protectBarCashHistory"() RETURNS trigger AS $$
BEGIN
  IF (to_jsonb(NEW)-ARRAY['voidedAt','voidedById','voidReason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['voidedAt','voidedById','voidReason'])
    OR OLD."voidedAt" IS NOT NULL OR NEW."voidedAt" IS NULL OR NEW."voidedById" IS NULL OR length(trim(NEW."voidReason"))<3 THEN
    RAISE EXCEPTION 'Bar ledger corrections require a recorded void; snapshots cannot be edited';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "BarSale_history" BEFORE UPDATE ON "BarSale" FOR EACH ROW EXECUTE FUNCTION "protectBarCashHistory"();
CREATE TRIGGER "BarCashEntry_history" BEFORE UPDATE ON "BarCashEntry" FOR EACH ROW EXECUTE FUNCTION "protectBarCashHistory"();
