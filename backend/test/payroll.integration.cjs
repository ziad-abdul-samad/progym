// Financial tests are allowed ONLY on the isolated loopback PostgreSQL cluster.
// Build backend first; migrate/seed a disposable database before running normally.
// --check-migration verifies preservation on an existing LOCAL fixture and applies DDL only.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { PayrollService } = require('../dist/features/finance/payroll.service');
const { FinanceService } = require('../dist/features/finance/finance.service');
const { hashPassword } = require('../dist/common/utils/hash.util');

const url = new URL(process.env.DATABASE_URL || '');
assert.equal(url.hostname, '127.0.0.1', 'NEVER run financial tests against customer data');
assert.equal(url.port, '55434', 'Use the isolated accounting cluster');
const db = new PrismaService(),
  payroll = new PayrollService(db),
  finance = new FinanceService(db);
const stamp = randomUUID().slice(0, 8);
let checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
  console.log('PASS', message);
}
async function rejected(promise, status, message) {
  await assert.rejects(promise, (error) => (status ? error.getStatus?.() === status : true));
  check(true, message);
}
const key = () => randomUUID();
const date = '2026-10-01',
  month = '2026-09';
const query = (period = month, status = 'ACTIVE', q = '') => ({
  month: period,
  status,
  q,
  page: 1,
});
const dto = (name = 'أحمد عامل ' + stamp) => ({
  name,
  jobTitle: 'عامل استقبال',
  salaryMinor: 100000,
  currency: 'SYP_NEW',
});
const revision = (p) => p.updatedAt.toISOString();
const payDto = (person, count = 0, extra = {}) => ({
  recipientId: person.id,
  month,
  spentOn: date,
  amountMinor: 40000,
  currency: 'SYP_NEW',
  requestKey: key(),
  expectedUpdatedAt: revision(person),
  previousPaymentCount: count,
  ...extra,
});
async function actor(code, role = 'OBSERVER') {
  const user = await db.user.create({
    data: {
      username: 'payroll.' + role.toLowerCase() + '.' + code + '.' + stamp,
      fullName: 'اختبار الرواتب ' + code,
      phone: 'payroll-' + code + '-' + role + '-' + stamp,
      role,
      passwordHash: await hashPassword('TestOnly!2026'),
    },
  });
  let observer;
  if (role === 'OBSERVER')
    observer = await db.shiftObserver.create({
      data: {
        userId: user.id,
        fullName: user.fullName,
        phone: user.phone,
        branchId: 'branch_' + code,
        shiftStart: '07:00',
        shiftEnd: '14:00',
        audience: 'MEN',
      },
    });
  return {
    ...user,
    branchId: 'branch_' + code,
    branchCode: code,
    observerAudience: 'MEN',
    shiftObserverId: observer?.id,
  };
}
async function preservation() {
  const tables = [
    'User',
    'ShiftObserver',
    'Subscription',
    'Payment',
    'MembershipPlan',
    'Expense',
    'Branch',
  ];
  async function snapshot() {
    const result = {};
    for (const table of tables) {
      // Table names are a fixed allowlist, never user input. Strip additive expense columns.
      result[table] = await db.$queryRawUnsafe(
        `SELECT to_jsonb(t) - ARRAY['kind','salaryRecipientId','salaryNameSnapshot','salaryJobSnapshot','salaryMonth'] AS row FROM "${table}" t ORDER BY id`,
      );
    }
    return result;
  }
  const before = await snapshot();
  const hadPayroll = (await db.$queryRaw`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Expense' AND column_name='kind') AS present`)[0].present;
  const previousSalaryCount = hadPayroll ? await db.expense.count({ where: { kind: 'SALARY' } }) : 0;
  await db.$disconnect();
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  assert.deepEqual(await snapshot(), before);
  check(
    true,
    'Additive payroll migration preserves all previous accounts, plans, subscriptions, payments and expense fields',
  );
  check(
    (await db.expense.count({ where: { kind: 'SALARY' } })) === previousSalaryCount,
    'Migration preserves previously paid salaries and invents no payroll',
  );
}
async function run() {
  if (process.argv.includes('--check-migration')) return preservation();
  const observers = await Promise.all(['b1', 'b2', 'b3'].map((b) => actor(b)));
  const owner = await actor('b1', 'ADMIN'),
    a = observers[0];
  const originalExpenseCount = await db.expense.count();
  const people = await Promise.all(observers.map((a) => payroll.createRecipient(dto(), a)));
  check(
    (await db.expense.count()) === originalExpenseCount,
    'Saving names creates no expense or liability',
  );
  for (let i = 0; i < 3; i++) {
    const list = await payroll.recipients(query(), observers[i]);
    check(
      list.items.some((p) => p.id === people[i].id) &&
        !list.items.some((p) => p.id === people[(i + 1) % 3].id),
      'Directory branch isolation ' + observers[i].branchCode,
    );
  }
  await rejected(
    payroll.createRecipient(dto('  أحمد  عامل ' + stamp + '  '), a),
    409,
    'Normalized duplicate name rejected',
  );
  await rejected(payroll.createRecipient(dto('  '), a), 400, 'Whitespace-only worker rejected');
  await rejected(
    payroll.recipients(query(), { ...owner, branchId: undefined }),
    400,
    'Owner must select a branch',
  );
  await rejected(
    payroll.updateRecipient(people[1].id, { ...dto(), expectedUpdatedAt: revision(people[1]) }, a),
    404,
    'Cross-branch edits rejected',
  );
  await rejected(
    payroll.pay(payDto(people[1]), { ...owner, branchId: undefined }),
    400,
    'Actor without branch rejected',
  );
  await rejected(payroll.pay(payDto(people[1]), a), 404, 'Cross-branch salary payment rejected');
  await rejected(
    payroll.pay(payDto(people[0], 0, { spentOn: '2099-01-01' }), a),
    400,
    'Future cash payment rejected',
  );
  await rejected(
    payroll.pay(payDto(people[0], 0, { spentOn: '2026-02-30' }), a),
    400,
    'Invalid cash date rejected',
  );

  const firstDto = payDto(people[0]);
  const first = await payroll.pay(firstDto, a);
  const retry = await payroll.pay(firstDto, a);
  check(
    first.id === retry.id &&
      (await db.expense.count({ where: { requestKey: firstDto.requestKey } })) === 1,
    'Retry records exactly one salary expense',
  );
  check(
    first.salaryNameSnapshot === people[0].name && first.kind === 'SALARY',
    'Salary name/job/month snapshots saved',
  );
  await rejected(
    payroll.pay({ ...firstDto, amountMinor: 40001 }, a),
    409,
    'Changed payload cannot reuse payment key',
  );
  await rejected(
    finance.addExpense(
      {
        title: first.title,
        amountMinor: first.amountMinor,
        currency: first.currency,
        spentOn: date,
        requestKey: first.requestKey,
      },
      a,
    ),
    409,
    'General expense cannot reuse salary key',
  );
  await rejected(
    payroll.pay(payDto(people[0], 0), a),
    409,
    'Stale payment count blocks duplicate payment',
  );
  await rejected(
    payroll.pay(payDto(people[0], 1), a),
    409,
    'Additional installment requires explicit confirmation',
  );
  const second = await payroll.pay(
    payDto(people[0], 1, { amountMinor: 60000, confirmAdditional: true }),
    a,
  );
  const paid = (await payroll.recipients(query(), a)).items.find((p) => p.id === people[0].id);
  check(
    paid.paymentCount === 2 && paid.paid[0].amountMinor === 100000,
    'Two installments total actual paid salary',
  );
  check(
    (await payroll.recipients(query('2026-10'), a)).items.find((p) => p.id === people[0].id)
      .paymentCount === 0,
    'Monthly directory separates salary periods',
  );
  const beforeEdit = await db.expense.findUniqueOrThrow({ where: { id: first.id } });
  const edited = await payroll.updateRecipient(
    people[0].id,
    {
      ...dto('اسم جديد ' + stamp),
      jobTitle: 'عامل صيانة',
      salaryMinor: 20000,
      currency: 'USD',
      expectedUpdatedAt: revision(people[0]),
    },
    owner,
  );
  assert.deepEqual(await db.expense.findUniqueOrThrow({ where: { id: first.id } }), beforeEdit);
  check(true, 'Name/job/reference salary edits never reprice or rename old cash entries');
  await rejected(
    payroll.pay(payDto(people[0], 2, { confirmAdditional: true }), a),
    409,
    'Edited worker requires new revision before payment',
  );
  await rejected(
    payroll.updateRecipient(edited.id, { ...dto(), expectedUpdatedAt: revision(people[0]) }, a),
    409,
    'Stale directory edits rejected',
  );
  const dollar = await payroll.pay(
    payDto(edited, 2, { amountMinor: 2500, currency: 'USD', confirmAdditional: true }),
    a,
  );
  const general = await finance.addExpense(
    {
      title: 'صيانة مرآة اختبار',
      amountMinor: 5000,
      currency: 'SYP_NEW',
      spentOn: date,
      requestKey: key(),
    },
    a,
  );
  const report = await finance.report({ from: date, to: date, page: 1 }, a);
  const syp = report.totals.find((t) => t.currency === 'SYP_NEW'),
    usd = report.totals.find((t) => t.currency === 'USD');
  check(
    syp.salaryMinor === 100000 &&
      syp.otherExpenseMinor === 5000 &&
      syp.expenseMinor === 105000 &&
      syp.netMinor === syp.incomeMinor - 105000,
    'Salary included once in cash expenses/net, other expenses separate',
  );
  check(
    usd.salaryMinor === 2500 && usd.expenseMinor === 2500 && usd.otherExpenseMinor === 0,
    'USD and new Syrian pounds never mixed',
  );
  check(
    report.salaries.some(
      (p) => p.name === people[0].name && p.totalMinor === 100000 && p.month === month,
    ) && report.salaries.some((p) => p.name === edited.name && p.currency === 'USD'),
    'Report keeps historical identity and salary month',
  );
  check(
    !(await finance.report({ from: '2026-09-01', to: '2026-09-30', page: 1 }, a)).salaries.length,
    'September salary paid in October counts only on actual October cash date',
  );
  check(
    !(await finance.report({ from: date, to: date, page: 1 }, observers[1])).expenses.some(
      (e) => e.id === first.id,
    ),
    'Reports do not leak other branch salaries',
  );
  await rejected(
    finance.voidExpense(second.id, ' ', a),
    400,
    'Salary correction requires an audit reason',
  );
  await rejected(
    finance.voidExpense(second.id, 'سبب اختبار', observers[1]),
    404,
    'Cross-branch salary void rejected',
  );
  await finance.voidExpense(second.id, 'دفعة مكررة في الاختبار', a);
  const corrected = await finance.report({ from: date, to: date, page: 1 }, a);
  check(
    corrected.totals.find((t) => t.currency === 'SYP_NEW').salaryMinor === 40000 &&
      corrected.salaries.find((s) => s.name === people[0].name).totalMinor === 40000,
    'Voided salary excluded from totals and payroll section',
  );
  check(
    corrected.expenses.some((e) => e.id === second.id && e.voidedAt),
    'Voided entry retained in details for audit',
  );
  const afterVoid = (await payroll.recipients(query(), a)).items.find((p) => p.id === edited.id);
  check(
    afterVoid.paymentCount === 2 &&
      afterVoid.paid.find((p) => p.currency === 'SYP_NEW').amountMinor === 40000,
    'Monthly payment overview excludes voided entries',
  );
  const archived = await payroll.status(
    edited.id,
    { archived: true, expectedUpdatedAt: revision(edited) },
    a,
  );
  check(
    !(await payroll.recipients(query(), a)).items.some((p) => p.id === edited.id) &&
      (await payroll.recipients(query(month, 'ARCHIVED'), a)).items.some((p) => p.id === edited.id),
    'Departed worker archived, saved names and history retained',
  );
  await rejected(
    payroll.pay(payDto(archived, 2, { confirmAdditional: true }), a),
    400,
    'New payments blocked for archived worker',
  );
  check(
    (await payroll.pay(firstDto, a)).id === first.id,
    'Network retry of completed payment works even after worker archived',
  );
  const restored = await payroll.status(
    archived.id,
    { archived: false, expectedUpdatedAt: revision(archived) },
    owner,
  );
  check(!restored.archivedAt, 'Owner can restore staff without changing past expense entries');
  const racing = await payroll.createRecipient(dto('عامل تزامن ' + stamp), a);
  const concurrent = await Promise.allSettled([
    payroll.pay(payDto(racing), a),
    payroll.pay(payDto(racing), a),
  ]);
  check(
    concurrent.filter((r) => r.status === 'fulfilled').length === 1 &&
      concurrent.filter((r) => r.status === 'rejected' && r.reason.getStatus() === 409).length ===
        1,
    'Two observers cannot accidentally pay the same first installment simultaneously',
  );
  const sameKey = payDto(racing, 1, { confirmAdditional: true });
  const retries = await Promise.all([payroll.pay(sameKey, a), payroll.pay(sameKey, a)]);
  check(retries[0].id === retries[1].id, 'Concurrent same-key retries return one entry');
  await rejected(
    db.expense.create({
      data: {
        branchId: 'branch_b2',
        kind: 'SALARY',
        salaryRecipientId: people[0].id,
        salaryNameSnapshot: people[0].name,
        salaryMonth: month,
        amountMinor: 1,
        currency: 'USD',
        title: 'Invalid cross branch',
        createdById: a.id,
        createdByName: a.fullName,
        requestKey: key(),
        spentAt: new Date(),
      },
    }),
    null,
    'Database composite foreign key blocks cross-branch linkage',
  );
  await rejected(
    db.expense.create({
      data: {
        branchId: a.branchId,
        kind: 'SALARY',
        title: 'Missing salary snapshots',
        amountMinor: 1,
        currency: 'USD',
        createdById: a.id,
        createdByName: a.fullName,
        requestKey: key(),
        spentAt: new Date(),
      },
    }),
    null,
    'Database rejects incomplete salary ledger entry',
  );
  check(
    (await db.auditLog.count({ where: { entityId: first.id, action: 'CREATE' } })) === 1 &&
      (await db.auditLog.count({ where: { entityId: second.id, action: 'UPDATE' } })) === 1,
    'One payment audit per actual cash entry plus audited correction',
  );
  check(
    general.kind === 'GENERAL' && dollar.salaryNameSnapshot === edited.name,
    'General expenses unchanged; later salary uses current snapshot',
  );
  for (let i = 0; i < 21; i++)
    await payroll.createRecipient(
      dto('عامل بحث ' + stamp + ' ' + String(i).padStart(2, '0')),
      observers[1],
    );
  const pageOne = await payroll.recipients(query(), observers[1]);
  const pageTwo = await payroll.recipients({ ...query(), page: 2 }, observers[1]);
  check(
    pageOne.items.length === 20 &&
      pageTwo.items.length === 2 &&
      pageTwo.meta.total === 22 &&
      !pageOne.items.some((p) => pageTwo.items.some((s) => s.id === p.id)),
    'Directory paginates without missing or repeated staff',
  );
  const search = await payroll.recipients(
    query(month, 'ACTIVE', 'عامل بحث ' + stamp + ' 20'),
    observers[1],
  );
  check(
    search.items.length === 1 && search.meta.total === 1,
    'Saved worker search finds a specific person across pages',
  );
  console.log('LOCAL UI fixture owner:', owner.username, 'observer:', a.username);
}
run()
  .then(() => console.log('Payroll integration:', checks, 'checks passed'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
