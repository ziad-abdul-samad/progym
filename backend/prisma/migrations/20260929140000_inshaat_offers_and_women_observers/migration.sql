-- One-time Inshaat catalog update. Historical payment snapshots are untouched.
UPDATE "MembershipPlan" SET "priceMinor" = 45000, "updatedAt" = CURRENT_TIMESTAMP
WHERE id = 'b1_daily_2026' AND "branchId" = (SELECT id FROM "Branch" WHERE code='b1');
INSERT INTO "MembershipPlan" ("id","branchId","nameAr","nameEn","durationDays","priceMinor","currency","sortOrder","updatedAt")
SELECT v.id,b.id,v.ar,v.en,v.days,v.price,v.currency,v.sort,CURRENT_TIMESTAMP
FROM (VALUES
 ('b1_monthly_syp_2026','اشتراك شهري — ليرة سورية','Monthly — Syrian pounds',30,400000,'SYP_NEW',3),
 ('b1_half_syp_2026','نصف شهر — ليرة سورية','Half month — Syrian pounds',15,200000,'SYP_NEW',4),
 ('b1_half_usd_2026','نصف شهر — دولار','Half month — USD',15,1500,'USD',5),
 ('b1_women_monthly_2026','سيدات — اشتراك شهري','Women — monthly',30,225000,'SYP_NEW',6),
 ('b1_women_daily_2026','سيدات — دخول يوم واحد','Women — day pass',1,35000,'SYP_NEW',7),
 ('b1_women_half_2026','سيدات — نصف شهر','Women — half month',15,150000,'SYP_NEW',8)
) AS v(id,ar,en,days,price,currency,sort)
JOIN "Branch" b ON b.code='b1'
ON CONFLICT ("id") DO NOTHING;

-- Distinct random credentials, only Argon2 hashes in source control.
-- These are one-time account inserts, not recurring seeds: owner edits/deletions
-- and all three pre-existing Inshaat observers are preserved.

INSERT INTO "User" ("id","username","fullName","phone","passwordHash","role","status","updatedAt")
VALUES ('b1_women_observer_user_1','b1.girls.observer.1','مراقبة السيدات — الفترة الأولى','+963900000311','$argon2id$v=19$m=65536,t=3,p=4$qAohEZ6Rj/TjuIgFJFgOXA$DmLNRPVp7Rff4Tu0f9/WwDoMzFj6Cm1kqV2RcacNmoU','OBSERVER','ACTIVE',CURRENT_TIMESTAMP);
INSERT INTO "ShiftObserver" ("id","userId","branchId","seedKey","fullName","phone","notes","shiftStart","shiftEnd","updatedAt")
SELECT 'b1_women_observer_1','b1_women_observer_user_1',b.id,'b1:women:shift:1','مراقبة السيدات — الفترة الأولى','+963900000311',
'قسم السيدات — من 7 صباحاً إلى 3 مساءً','07:00','15:00',CURRENT_TIMESTAMP
FROM "Branch" b WHERE b.code='b1';

INSERT INTO "User" ("id","username","fullName","phone","passwordHash","role","status","updatedAt")
VALUES ('b1_women_observer_user_2','b1.girls.observer.2','مراقبة السيدات — الفترة الثانية','+963900000312','$argon2id$v=19$m=65536,t=3,p=4$kbSltXWBospbfk/Z1cUrAw$tlbM7VvOJUZmDUS7dxPw1NzZ++/Fpb8JJM0bWS7/fUE','OBSERVER','ACTIVE',CURRENT_TIMESTAMP);
INSERT INTO "ShiftObserver" ("id","userId","branchId","seedKey","fullName","phone","notes","shiftStart","shiftEnd","updatedAt")
SELECT 'b1_women_observer_2','b1_women_observer_user_2',b.id,'b1:women:shift:2','مراقبة السيدات — الفترة الثانية','+963900000312',
'قسم السيدات — من 3 مساءً إلى 10 مساءً','15:00','22:00',CURRENT_TIMESTAMP
FROM "Branch" b WHERE b.code='b1';
