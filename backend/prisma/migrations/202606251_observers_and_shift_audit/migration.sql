CREATE TYPE "ObserverStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "ShiftObserver" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "status" "ObserverStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftObserver_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MembershipAuditLog" ADD COLUMN "observerId" TEXT;
ALTER TABLE "MembershipAuditLog" ADD COLUMN "observerName" TEXT;

CREATE INDEX "ShiftObserver_status_fullName_idx" ON "ShiftObserver"("status", "fullName");
CREATE INDEX "ShiftObserver_createdAt_idx" ON "ShiftObserver"("createdAt");
CREATE INDEX "MembershipAuditLog_observerId_createdAt_idx" ON "MembershipAuditLog"("observerId", "createdAt");

ALTER TABLE "MembershipAuditLog" ADD CONSTRAINT "MembershipAuditLog_observerId_fkey" FOREIGN KEY ("observerId") REFERENCES "ShiftObserver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
