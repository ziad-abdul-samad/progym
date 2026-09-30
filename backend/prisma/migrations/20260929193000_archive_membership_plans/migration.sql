-- A deleted offer disappears from the catalog, but existing subscriptions and
-- historical receipt references remain valid. No financial records are removed.
ALTER TABLE "MembershipPlan" ADD COLUMN "deletedAt" TIMESTAMP(3);
