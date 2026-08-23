-- Introduce first-class Pro Gym branches without deleting or re-keying existing data.
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "addressAr" TEXT NOT NULL,
    "addressEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");
CREATE UNIQUE INDEX "Branch_slug_key" ON "Branch"("slug");
CREATE INDEX "Branch_isActive_sortOrder_idx" ON "Branch"("isActive", "sortOrder");

INSERT INTO "Branch" ("id", "code", "slug", "nameAr", "nameEn", "addressAr", "addressEn", "sortOrder", "updatedAt")
VALUES
  ('branch_b1', 'b1', 'inshaat', 'الإنشاءات مقابل الفرن الآلي', 'Al-Inshaat', 'الإنشاءات مقابل الفرن الآلي', 'Al-Inshaat, opposite the automatic bakery', 1, CURRENT_TIMESTAMP),
  ('branch_b2', 'b2', 'jourat-al-shayah', 'جورة الشياح مقابل المشفى الوطني', 'Jourat Al-Shayah', 'جورة الشياح مقابل المشفى الوطني', 'Jourat Al-Shayah, opposite the National Hospital', 2, CURRENT_TIMESTAMP),
  ('branch_b3', 'b3', 'march-8', 'بروجيم 8 آذار', 'Pro Gym March 8', 'بروجيم 8 آذار', 'Pro Gym March 8', 3, CURRENT_TIMESTAMP);

ALTER TABLE "MemberProfile" ADD COLUMN "homeBranchId" TEXT;
ALTER TABLE "CoachAssignment" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "branchId" TEXT;
ALTER TABLE "MembershipAuditLog" ADD COLUMN "branchId" TEXT;
ALTER TABLE "ShiftObserver" ADD COLUMN "branchId" TEXT;
ALTER TABLE "RegistrationRequest" ADD COLUMN "branchId" TEXT;
ALTER TABLE "QrInvite" ADD COLUMN "branchId" TEXT;
ALTER TABLE "AttendanceQrSession" ADD COLUMN "branchId" TEXT;
ALTER TABLE "AttendanceRecord" ADD COLUMN "branchId" TEXT;
ALTER TABLE "FileAsset" ADD COLUMN "branchId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "branchId" TEXT;
ALTER TABLE "GymSettings" ADD COLUMN "branchId" TEXT;

UPDATE "MemberProfile" SET "homeBranchId" = 'branch_b1' WHERE "homeBranchId" IS NULL;
UPDATE "CoachAssignment" SET "branchId" = 'branch_b1' WHERE "branchId" IS NULL;
UPDATE "Subscription" SET "branchId" = 'branch_b1' WHERE "branchId" IS NULL;
UPDATE "MembershipAuditLog" SET "branchId" = 'branch_b1' WHERE "branchId" IS NULL;
UPDATE "ShiftObserver" SET "branchId" = 'branch_b1' WHERE "branchId" IS NULL;
UPDATE "RegistrationRequest" SET "branchId" = 'branch_b1' WHERE "branchId" IS NULL;
UPDATE "QrInvite" SET "branchId" = 'branch_b1' WHERE "branchId" IS NULL;
UPDATE "AttendanceQrSession" SET "branchId" = 'branch_b1' WHERE "branchId" IS NULL;
UPDATE "AttendanceRecord" SET "branchId" = 'branch_b1' WHERE "branchId" IS NULL;
UPDATE "AuditLog" SET "branchId" = 'branch_b1' WHERE "branchId" IS NULL;
UPDATE "GymSettings" SET "branchId" = 'branch_b1', "singletonKey" = 'branch-b1' WHERE "branchId" IS NULL;

UPDATE "FileAsset" AS file
SET "branchId" = member."homeBranchId"
FROM "User" AS owner
JOIN "MemberProfile" AS member ON member."userId" = owner."id"
WHERE file."ownerUserId" = owner."id" AND file."branchId" IS NULL;

INSERT INTO "GymSettings" (
  "id", "singletonKey", "branchId", "nameAr", "nameEn", "descriptionAr", "descriptionEn",
  "phone", "email", "addressAr", "addressEn", "openingHours", "socialLinks", "logoUrl",
  "monthlySubscriptionPriceMinor", "membershipCurrency", "createdAt", "updatedAt"
)
SELECT
  'settings_b2', 'branch-b2', 'branch_b2', "nameAr", "nameEn", "descriptionAr", "descriptionEn",
  "phone", "email", 'جورة الشياح مقابل المشفى الوطني', 'Jourat Al-Shayah, opposite the National Hospital',
  "openingHours", "socialLinks", "logoUrl", 2500, "membershipCurrency", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "GymSettings" WHERE "branchId" = 'branch_b1'
ON CONFLICT ("singletonKey") DO NOTHING;

INSERT INTO "GymSettings" (
  "id", "singletonKey", "branchId", "nameAr", "nameEn", "descriptionAr", "descriptionEn",
  "phone", "email", "addressAr", "addressEn", "openingHours", "socialLinks", "logoUrl",
  "monthlySubscriptionPriceMinor", "membershipCurrency", "createdAt", "updatedAt"
)
SELECT
  'settings_b3', 'branch-b3', 'branch_b3', "nameAr", "nameEn", "descriptionAr", "descriptionEn",
  "phone", "email", 'بروجيم 8 آذار', 'Pro Gym March 8', "openingHours", "socialLinks", "logoUrl",
  2500, "membershipCurrency", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "GymSettings" WHERE "branchId" = 'branch_b1'
ON CONFLICT ("singletonKey") DO NOTHING;

ALTER TABLE "MemberProfile" ALTER COLUMN "homeBranchId" SET NOT NULL;
ALTER TABLE "CoachAssignment" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "MembershipAuditLog" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "ShiftObserver" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "RegistrationRequest" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "QrInvite" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "AttendanceQrSession" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "AttendanceRecord" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "GymSettings" ALTER COLUMN "branchId" SET NOT NULL;

CREATE TABLE "CoachBranch" (
    "coachId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoachBranch_pkey" PRIMARY KEY ("coachId", "branchId")
);

INSERT INTO "CoachBranch" ("coachId", "branchId")
SELECT coach."id", branch."id" FROM "CoachProfile" AS coach CROSS JOIN "Branch" AS branch
ON CONFLICT DO NOTHING;

CREATE INDEX "CoachBranch_branchId_coachId_idx" ON "CoachBranch"("branchId", "coachId");
CREATE INDEX "MemberProfile_homeBranchId_joinedAt_idx" ON "MemberProfile"("homeBranchId", "joinedAt");
CREATE INDEX "CoachAssignment_branchId_status_idx" ON "CoachAssignment"("branchId", "status");
CREATE INDEX "Subscription_branchId_status_endsAt_idx" ON "Subscription"("branchId", "status", "endsAt");
CREATE INDEX "MembershipAuditLog_branchId_createdAt_idx" ON "MembershipAuditLog"("branchId", "createdAt");
CREATE INDEX "ShiftObserver_branchId_status_idx" ON "ShiftObserver"("branchId", "status");
CREATE INDEX "RegistrationRequest_branchId_status_createdAt_idx" ON "RegistrationRequest"("branchId", "status", "createdAt");
CREATE INDEX "QrInvite_branchId_purpose_status_idx" ON "QrInvite"("branchId", "purpose", "status");
CREATE INDEX "AttendanceQrSession_branchId_status_expiresAt_idx" ON "AttendanceQrSession"("branchId", "status", "expiresAt");
CREATE INDEX "AttendanceRecord_branchId_attendanceDate_checkedInAt_idx" ON "AttendanceRecord"("branchId", "attendanceDate", "checkedInAt");
CREATE INDEX "FileAsset_branchId_createdAt_idx" ON "FileAsset"("branchId", "createdAt");
CREATE INDEX "AuditLog_branchId_createdAt_idx" ON "AuditLog"("branchId", "createdAt");
CREATE UNIQUE INDEX "GymSettings_branchId_key" ON "GymSettings"("branchId");

ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_homeBranchId_fkey" FOREIGN KEY ("homeBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachAssignment" ADD CONSTRAINT "CoachAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipAuditLog" ADD CONSTRAINT "MembershipAuditLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftObserver" ADD CONSTRAINT "ShiftObserver_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QrInvite" ADD CONSTRAINT "QrInvite_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceQrSession" ADD CONSTRAINT "AttendanceQrSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GymSettings" ADD CONSTRAINT "GymSettings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachBranch" ADD CONSTRAINT "CoachBranch_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachBranch" ADD CONSTRAINT "CoachBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
