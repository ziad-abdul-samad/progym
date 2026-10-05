require('reflect-metadata');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const argon2 = require('argon2');
const { applyBatch, fingerprints, PREFIX } = require('../scripts/presentation-demo.cjs');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { FinanceService } = require('../dist/features/finance/finance.service');

const url = new URL(process.env.DATABASE_URL || '');
assert.equal(url.hostname,'127.0.0.1','Never run these tests on production');
assert.equal(url.port,'55434','Use the isolated test cluster');
const client = new Client({ connectionString:process.env.DATABASE_URL });
const prisma = new PrismaService();
const finance = new FinanceService(prisma);
let checks = 0;
function check(value,message) { assert.ok(value,message); console.log('PASS',message); checks++; }
(async()=>{
  await client.connect();
  const baseline = await fingerprints(client);
  const report = (branchId,from='2026-08-29') => finance.report({ from,to:'2026-10-06',page:1 },{ id:'fixture',role:'ADMIN',branchId });
  const original = await Promise.all(['b1','b2','b3'].map((code)=>report('branch_'+code)));
  const hash = await argon2.hash('LocalFixtureOnly!2026');
  const dry = await applyBatch(client,{ passwordHash:hash,dryRun:true });
  check(dry.dryRun && !dry.committed,'Dry run validates all insert constraints and rolls back');
  check(JSON.stringify(await fingerprints(client))===JSON.stringify(baseline),'Dry run preserves all original records');
  check((await client.query('SELECT count(*) FROM "User" WHERE left(id,$1)=$2',[PREFIX.length,PREFIX])).rows[0].count==='0','Dry run leaves no fake users');
  const live = await applyBatch(client,{ passwordHash:hash,dryRun:false });
  check(live.committed,'Local additive batch committed');
  check(JSON.stringify(await fingerprints(client))===JSON.stringify(baseline),'Existing records remain byte-for-byte unchanged after commit');
  check(live.manifest.counts.User===100 && live.manifest.counts.MemberProfile===94,'All 94 demo players and 6 coaches created');
  check(live.manifest.counts.Payment===88 && live.manifest.counts.Expense===25,'88 receipts and 25 expenses created');
  check(live.manifest.counts.WorkoutPlan===6 && live.manifest.counts.NutritionPlan===6,'Every coach has a coached player with training and nutrition');
  const again = await applyBatch(client,{ passwordHash:hash,dryRun:false });
  check(again.alreadyApplied,'Repeat run is idempotent and never duplicates data');
  for (let i=0;i<3;i++) {
    const code='b'+(i+1),branchId='branch_'+code;
    const all=await report(branchId);
    const snapshot=live.manifest.overview.find((x)=>x.branch===code);
    check(all.receiptCount-original[i].receiptCount===snapshot.receipts,'Full-range receipt count matches '+code);
    check(all.expenseCount-original[i].expenseCount===snapshot.expenses,'Full-range expenses match '+code);
    for (const total of all.totals) {
      const before=original[i].totals.find((x)=>x.currency===total.currency) || { incomeMinor:0,expenseMinor:0 };
      const sums=(await client.query(`SELECT
        (SELECT coalesce(sum("amountMinor"),0) FROM "Payment" WHERE left(id,$1)=$2 AND "branchIdSnapshot"=$3 AND currency=$4)::int income,
        (SELECT coalesce(sum("amountMinor"),0) FROM "Expense" WHERE left(id,$1)=$2 AND "branchId"=$3 AND currency=$4)::int expense`,[PREFIX.length,PREFIX,branchId,total.currency])).rows[0];
      check(total.incomeMinor-before.incomeMinor===sums.income && total.expenseMinor-before.expenseMinor===sums.expense,'Report sums and currencies correct '+code+' '+total.currency);
      check(total.netMinor===total.incomeMinor-total.expenseMinor,'Report net correct '+code+' '+total.currency);
    }
    const today=await report(branchId,'2026-10-06');
    check(today.receiptCount>0 && today.receiptCount<all.receiptCount,'Daily report filters demo transactions '+code);
    const month=await report(branchId,'2026-09-07');
    check(month.receiptCount>today.receiptCount && month.receiptCount<all.receiptCount,'Monthly report filters demo history '+code);
    check((await client.query(`SELECT count(*) FROM "RegistrationRequest" WHERE left(id,$1)=$2 AND "branchId"=$3 AND status='PENDING'`,[PREFIX.length,PREFIX,branchId])).rows[0].count==='2','Two pending demo approvals '+code);
  }
  check((await client.query(`SELECT count(*) FROM "Subscription" WHERE left(id,$1)=$2 AND status='EXPIRED'`,[PREFIX.length,PREFIX])).rows[0].count>'0','Expired subscriptions included');
  const mismatch=(await client.query(`SELECT count(*) FROM "Payment" p JOIN "Subscription" s ON s.id=p."subscriptionId"
    JOIN "MembershipPlan" mp ON mp.id=s."planId" JOIN "ShiftObserver" o ON o."userId"=p."receivedById"
    WHERE left(p.id,$1)=$2 AND (mp.audience<>o.audience OR s."branchId"<>o."branchId" OR p."amountMinor"<>mp."priceMinor" OR p.currency<>mp.currency)`,[PREFIX.length,PREFIX])).rows[0].count;
  check(mismatch==='0','Receipt prices, branch and observer audience snapshots all consistent');
  console.log('RESULT',checks,'checks passed');
})().catch((error)=>{ console.error(error);process.exitCode=1; }).finally(async()=>{ await prisma.$disconnect();await client.end(); });
