// Run ONLY against a disposable, migrated local database:
// DATABASE_URL=postgresql://postgres@127.0.0.1:55434/postgres node test/accounting.integration.cjs
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { MembershipsService } = require('../dist/features/memberships/memberships.service');
const { FinanceService, businessRange } = require('../dist/features/finance/finance.service');
const { AdminService } = require('../dist/features/admin/admin.service');
const { AuthService } = require('../dist/features/auth/auth.service');
const { JwtService } = require('@nestjs/jwt');
const { hashPassword } = require('../dist/common/utils/hash.util');

const url = new URL(process.env.DATABASE_URL || '');
assert.equal(url.hostname, '127.0.0.1', 'Integration tests must never touch a remote database');
assert.equal(url.port, '55434', 'Use the isolated accounting test cluster');
const db = new PrismaService();
const memberships = new MembershipsService(db);
const finance = new FinanceService(db);
const admin = new AdminService(memberships, {}, db, {});
const auth = new AuthService(new JwtService(), memberships, db, {});
const stamp = randomUUID().slice(0, 8);
let checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
  console.log('PASS', message);
}
const key = () => randomUUID();
async function actor(branch, role = 'OBSERVER') {
  const user = await db.user.create({
    data: {
      username: 'test.' + role.toLowerCase() + '.' + branch + '.' + stamp,
      phone: role + branch + stamp,
      fullName: role === 'ADMIN' ? 'المالك التجريبي' : 'مراقب الاختبار ' + branch,
      role,
      passwordHash: await hashPassword('TestOnly!2026'),
    },
  });
  const observer = await db.shiftObserver.create({
    data: {
      branchId: 'branch_' + branch,
      userId: role === 'OBSERVER' ? user.id : null,
      fullName: user.fullName,
      phone: user.phone,
      shiftStart: '07:00',
      shiftEnd: '14:00',
    },
  });
  return {
    ...user,
    branchId: 'branch_' + branch,
    branchCode: branch,
    shiftObserverId: observer.id,
  };
}
async function register(branch, suffix) {
  return auth.register({
    fullName: 'لاعب تجربة ' + suffix,
    username: 'player.' + stamp + suffix,
    phone: '09' + stamp + suffix,
    password: 'TestOnly!2026',
    passwordConfirmation: 'TestOnly!2026',
    branchCode: branch,
    dateOfBirth: '1998-01-01',
    gender: 'MALE',
    heightCm: 180,
    weightKg: 80,
    fitnessGoal: 'زيادة القوة',
    question1Key: 'first_school',
    question1Answer: 'مدرسة',
    question2Key: 'childhood_friend',
    question2Answer: 'صديق',
    question3Key: 'birth_city',
    question3Answer: 'حمص',
  });
}
async function run() {
  const a = await actor('b1'),
    b = await actor('b2'),
    c = await actor('b3');
  const owner = await actor('b1', 'ADMIN');
  const [p1, p2, p3] = await Promise.all([
    memberships.listPlans(a),
    memberships.listPlans(b),
    memberships.listPlans(c),
  ]);
  check(p1.length === 8 && p2.length === 4 && p3.length === 3, 'Seeded plan counts 8 / 4 / 3');
  check(
    p1.find((p) => p.durationDays === 30).priceMinor === 3000 &&
      p1.find((p) => p.durationDays === 30).currency === 'USD',
    'B1 monthly USD30',
  );
  check(p3.find((p) => p.durationDays === 15).priceMinor === 175000, 'B3 half-month 1750 new SYP');
  const military = p2.find((p) => p.id === 'b2_military_2026');
  check(
    military.durationDays === 30 && military.priceMinor === 140000,
    'Military full month at half-month price',
  );
  const registration = await register('b2', 'one');
  const request = await db.registrationRequest.findUniqueOrThrow({
    where: { id: registration.requestId },
    include: { member: { include: { user: true } } },
  });
  check(
    request.member.user.avatarUrl === null && request.member.user.status === 'INACTIVE',
    'Registration without photo creates pending inactive account',
  );
  await assert.rejects(
    admin.reviewRegistrationRequest(
      request.id,
      { approve: true, planId: p1[0].id, planUpdatedAt: p1[0].updatedAt.toISOString() },
      b,
    ),
  );
  check(
    (await db.user.findUnique({ where: { id: request.member.userId } })).status === 'INACTIVE' &&
      (await db.payment.count()) === 0,
    'Wrong branch plan rolls back activation and payment',
  );
  const reviews = await Promise.allSettled(
    [1, 2].map(() =>
      admin.reviewRegistrationRequest(
        request.id,
        { approve: true, planId: military.id, planUpdatedAt: military.updatedAt.toISOString() },
        b,
      ),
    ),
  );
  check(
    reviews.filter((r) => r.status === 'fulfilled').length === 1 &&
      (await db.payment.count()) === 1,
    'Concurrent approvals produce exactly one subscription receipt',
  );
  const sub = reviews.find((r) => r.status === 'fulfilled').value.subscription;
  const receipt = await db.payment.findFirstOrThrow();
  check(
    receipt.amountMinor === 140000 &&
      receipt.planNameSnapshot === military.nameAr &&
      receipt.observerNameSnapshot === b.fullName,
    'Receipt snapshots actual plan, amount and observer',
  );
  check(
    Math.round((sub.endsAt - sub.startsAt) / 86400000) === 30,
    'Selected plan grants exactly 30 days',
  );
  const edited = await memberships.updatePlan(
    military.id,
    { priceMinor: 150000, nameAr: 'اشتراك عسكري معدل' },
    b,
  );
  await assert.rejects(
    memberships.mutateSubscription(
      sub.id,
      'RENEW',
      {
        planId: military.id,
        planUpdatedAt: military.updatedAt.toISOString(),
        requestKey: key(),
        reason: 'تجديد',
      },
      b,
    ),
  );
  check((await db.payment.count()) === 1, 'Stale displayed price rejected, no extra payment');
  const renewal = {
    planId: edited.id,
    planUpdatedAt: edited.updatedAt.toISOString(),
    requestKey: key(),
    reason: 'تجديد',
  };
  await Promise.all([1, 2].map(() => memberships.mutateSubscription(sub.id, 'RENEW', renewal, b)));
  check((await db.payment.count()) === 2, 'Concurrent retry of renewal is idempotent');
  check(
    (await db.payment.findUnique({ where: { id: receipt.id } })).amountMinor === 140000,
    'Old receipt unchanged after price edit',
  );
  await memberships.mutateSubscription(
    sub.id,
    'ADD_DAYS',
    { days: 3, reason: 'تعويض إغلاق الصالة', requestKey: key() },
    b,
  );
  check((await db.payment.count()) === 2, 'Administrative day adjustment generates no income');
  await assert.rejects(memberships.updatePlan(military.id, { priceMinor: 1 }, a));
  await assert.rejects(
    memberships.mutateSubscription(
      sub.id,
      'ADD_DAYS',
      { days: 2, reason: 'test', requestKey: key() },
      a,
    ),
  );
  check(true, 'Other branch cannot edit plan or subscription');
  const day = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
  const reportRange = { from: day, to: day, page: 1 };
  const expense = {
    title: 'شراء مرآة',
    notes: 'مرآة جديدة للقاعة',
    amountMinor: 10000,
    currency: 'SYP_NEW',
    spentOn: day,
    requestKey: key(),
  };
  await Promise.all([1, 2].map(() => finance.addExpense(expense, b)));
  const dollarExpense = await finance.addExpense(
    { ...expense, currency: 'USD', amountMinor: 500, requestKey: key() },
    b,
  );
  const report = await finance.report(reportRange, b);
  check(report.expenseCount === 2, 'Expense retries record exactly one expense');
  check(
    report.plans.length === 2 &&
      report.plans.some((p) => p.unitPriceMinor === 140000) &&
      report.plans.some((p) => p.unitPriceMinor === 150000),
    'Report preserves both price versions',
  );
  check(
    report.totals.find((t) => t.currency === 'SYP_NEW').netMinor === 280000 &&
      report.totals.find((t) => t.currency === 'USD').netMinor === -500,
    'Totals and net never mix USD with new SYP',
  );
  check(
    (await finance.report(reportRange, a)).receiptCount === 0,
    'Branch financial report isolation',
  );
  await assert.rejects(finance.voidExpense(dollarExpense.id, 'خطأ في القيد', a));
  await finance.voidExpense(dollarExpense.id, 'خطأ في العملة', b);
  check(
    (await finance.report(reportRange, b)).expenseCount === 2 &&
      (await db.expense.findUnique({ where: { id: dollarExpense.id } })).voidReason ===
        'خطأ في العملة',
    'Voided expense retained with audit reason',
  );
  check(
    businessRange('2026-09-01', '2026-09-01').gte.toISOString() === '2026-08-31T21:00:00.000Z',
    'Damascus date boundary',
  );
  assert.throws(() => businessRange('2026-02-30', '2026-03-01'));
  check(true, 'Invalid calendar date rejected');
  const newPlan = await memberships.createPlan(
    {
      nameAr: 'عرض شهرين',
      nameEn: 'Two months',
      durationDays: 60,
      priceMinor: 6000,
      currency: 'USD',
    },
    a,
  );
  const transfer = await memberships.createSubscription(
    {
      memberId: request.memberId,
      planId: newPlan.id,
      planUpdatedAt: newPlan.updatedAt.toISOString(),
      requestKey: key(),
      reason: 'انتقال بعد الدفع',
    },
    a,
  );
  check(
    transfer.branchId === a.branchId &&
      Math.round((transfer.endsAt - transfer.startsAt) / 86400000) === 60,
    'Custom offer and branch transfer use exact duration',
  );
  check(
    (await finance.report(reportRange, b)).receiptCount === 2 &&
      (await finance.report(reportRange, a)).totals[0].incomeMinor === 6000,
    'Transfer never moves historical receipts between branches',
  );
  const approval2 = await register('b3', 'two');
  await admin.reviewRegistrationRequest(
    approval2.requestId,
    { approve: false, reason: 'طلب مكرر' },
    c,
  );
  check(
    (await db.registrationRequest.findUnique({ where: { id: approval2.requestId } })).status ===
      'REJECTED',
    'Rejection creates no subscription',
  );
  await memberships.updatePlan(
    military.id,
    { priceMinor: military.priceMinor, nameAr: military.nameAr },
    b,
  );
  console.log(
    JSON.stringify({ checks, owner: owner.username, observer: b.username, reportDay: day }),
  );
}
run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
