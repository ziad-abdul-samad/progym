// Safe on an existing local accounting fixture: verifies migration preservation.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { Client } = require('pg');
const path = require('node:path');
const url = new URL(process.env.DATABASE_URL || '');
assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.port, '55434');
const db = new Client({ connectionString: process.env.DATABASE_URL });
async function main() {
  await db.connect();
  const before = {};
  for (const table of ['User', 'ShiftObserver', 'Subscription', 'Payment']) {
    before[table] = (await db.query(`SELECT * FROM "${table}" ORDER BY id`)).rows;
  }
  execFileSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
  for (const [table, rows] of Object.entries(before)) {
    const after = (await db.query(`SELECT * FROM "${table}" ORDER BY id`)).rows;
    for (const row of rows) assert.deepEqual(after.find((next) => next.id === row.id), row, `Existing ${table} changed`);
    console.log('PASS preserved every existing', table, 'row:', rows.length);
  }
  const offers = (await db.query(`SELECT id,"durationDays","priceMinor",currency FROM "MembershipPlan" WHERE "branchId"='branch_b1' ORDER BY id`)).rows;
  const expected = { b1_daily_2026: [1,45000,'SYP_NEW'], b1_monthly_2026:[30,3000,'USD'], b1_monthly_syp_2026:[30,400000,'SYP_NEW'], b1_half_syp_2026:[15,200000,'SYP_NEW'], b1_half_usd_2026:[15,1500,'USD'], b1_women_monthly_2026:[30,225000,'SYP_NEW'], b1_women_daily_2026:[1,35000,'SYP_NEW'], b1_women_half_2026:[15,150000,'SYP_NEW'] };
  const seeded = offers.filter(p => expected[p.id]);
  assert.equal(seeded.length, 8);
  for (const p of seeded) assert.deepEqual([p.durationDays,p.priceMinor,p.currency],expected[p.id]);
  console.log('PASS all 8 requested Inshaat prices, currencies and durations');
  const observers = (await db.query(`SELECT s."shiftStart",s."shiftEnd",s."branchId",u.role,u."passwordHash" FROM "ShiftObserver" s JOIN "User" u ON u.id=s."userId" WHERE s.id IN ('b1_women_observer_1','b1_women_observer_2') ORDER BY s.id`)).rows;
  assert.equal(observers.length,2);
  assert.deepEqual(observers.map(o=>[o.shiftStart,o.shiftEnd,o.branchId,o.role]),[['07:00','15:00','branch_b1','OBSERVER'],['15:00','22:00','branch_b1','OBSERVER']]);
  assert.notEqual(observers[0].passwordHash,observers[1].passwordHash);
  console.log('PASS separate observer credentials, branch and shifts');
  execFileSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
  console.log('PASS repeat deploy does not recreate/reset accounts or catalog');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.end());
