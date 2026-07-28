ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OBSERVER';

ALTER TABLE "ShiftObserver"
ADD COLUMN "userId" TEXT,
ADD COLUMN "shiftStart" TEXT,
ADD COLUMN "shiftEnd" TEXT;

CREATE UNIQUE INDEX "ShiftObserver_userId_key" ON "ShiftObserver"("userId");

ALTER TABLE "ShiftObserver"
ADD CONSTRAINT "ShiftObserver_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
