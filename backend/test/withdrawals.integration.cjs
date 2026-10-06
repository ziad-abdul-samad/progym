require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { FinanceService } = require('../dist/features/finance/finance.service');
const { OwnerWithdrawalsService } = require('../dist/features/finance/owner-withdrawals.service');
const { addDemoDirectory, fingerprints } = require('../scripts/payroll-directory-demo.cjs');
const url = new URL(process.env.DATABASE_URL || '');
assert.equal(url.hostname,'127.0.0.1','Never test financial mutations on live data');
assert.equal(url.port,'55434');
const db = new PrismaService(), finance = new FinanceService(db), draws = new OwnerWithdrawalsService(db);
let checks=0;
function check(value,label) { assert.ok(value,label); checks++; console.log('PASS',label); }
async function reject(promise,status,label) { await assert.rejects(promise,e=>status ? e.getStatus?.()===status : true); check(true,label); }
const key=()=>randomUUID(), stamp=key().slice(0,8);
async function actor(code,role='OBSERVER') {
  const u=await db.user.create({data:{ username:'draw.'+role+'.'+code+'.'+stamp,phone:'draw-'+role+code+stamp,fullName:'اختبار السحوبات '+code,role,passwordHash:'local-fixture-not-for-login' }});
  return {...u,branchId:'branch_'+code,branchCode:code};
}
const dto=(extra={})=>({ownerName:'مالك تجريبي',usdMinor:10000,sypNewMinor:100000,withdrawnOn:'2026-10-01',requestKey:key(),notes:'تسليم نقدي',...extra});
const range={from:'2026-10-01',to:'2026-10-01',page:1};
async function run() {
  const actors=await Promise.all(['b1','b2','b3'].map(code=>actor(code))), owner=await actor('b1','ADMIN');
  const expenses=await db.expense.count(), receipts=await db.payment.count();
  const request=dto(), record=await draws.add(request,actors[0]);
  check(record.usdMinor===10000 && record.sypNewMinor===100000,'Two currencies saved atomically in one visit');
  check(await db.expense.count()===expenses && await db.payment.count()===receipts,'Owner draw creates no expense or payment');
  check(record.createdById===actors[0].id && record.createdByName===actors[0].fullName,'Immutable handing-over observer snapshot');
  const repeats=await Promise.all(Array.from({length:5},()=>draws.add(request,actors[0])));
  check(repeats.every(r=>r.id===record.id),'Concurrent duplicate requests create one draw');
  check(await db.auditLog.count({where:{entityType:'OwnerWithdrawal',entityId:record.id,action:'CREATE'}})===1,'Retry emits only one creation audit');
  for (const extra of [{usdMinor:10001},{sypNewMinor:100001},{notes:'changed'},{ownerName:'آخر'},{withdrawnOn:'2026-10-02'}])
    await reject(draws.add({...request,...extra},actors[0]),409,'Changed retry payload rejected');
  await reject(draws.add(request,actors[1]),409,'Request key cannot cross branches');
  await reject(draws.add(request,owner),409,'Request key cannot cross actors');
  for (const extra of [{usdMinor:0,sypNewMinor:0},{usdMinor:-1},{sypNewMinor:0.5},{usdMinor:2000000001},{withdrawnOn:'2099-01-01'},{withdrawnOn:'2026-02-30'},{ownerName:' '}])
    await reject(draws.add(dto(extra),actors[0]),400,'Invalid amount/name/date rejected');
  let report=await finance.report(range,actors[0]);
  for (const currency of ['USD','SYP_NEW']) {
    const t=report.totals.find(t=>t.currency===currency), expected=currency==='USD'?10000:100000;
    check(t.ownerWithdrawalMinor===expected && t.expenseMinor===0 && t.cashMovementMinor===-expected && t.netMinor===0,'Draw-only currency included, negative movement not fabricated balance '+currency);
  }
  check(report.withdrawalCount===1 && report.withdrawals[0].id===record.id,'Report includes dated handover details');
  check((await finance.report(range,actors[1])).withdrawalCount===0,'Other-branch report isolated');
  check((await finance.report({from:'2026-09-30',to:'2026-09-30',page:1},actors[0])).withdrawalCount===0,'Damascus date boundaries exclude previous day');
  await finance.addExpense({ title:'مصروف اختبار',amountMinor:5000,currency:'USD',spentOn:'2026-10-01',requestKey:key() },actors[0]);
  report=await finance.report(range,actors[0]);
  const usd=report.totals.find(t=>t.currency==='USD');
  check(usd.expenseMinor===5000 && usd.netMinor===-5000 && usd.cashMovementMinor===-15000,'Operational expense and owner draw counted once each');
  await reject(draws.void(record.id,'خطأ',actors[1]),404,'Other observer cannot void branch draw');
  await reject(draws.void(record.id,' ',actors[0]),400,'Void needs a reason');
  await Promise.all([draws.void(record.id,'خطأ تجريبي',actors[0]),draws.void(record.id,'خطأ تجريبي',actors[0])]);
  check(await db.auditLog.count({where:{entityId:record.id,entityType:'OwnerWithdrawal',action:'UPDATE'}})===1,'Concurrent cancellation audited once');
  check((await draws.add(request,actors[0])).voidedAt,'Retry after void cannot resurrect draw');
  report=await finance.report(range,actors[0]);
  check(report.withdrawalCount===1 && report.withdrawals[0].voidReason==='خطأ تجريبي' && report.totals.every(t=>t.ownerWithdrawalMinor===0),'Cancelled draw retained, excluded from totals');
  const b3=await draws.add(dto({usdMinor:0,sypNewMinor:20000}),actors[2]);
  check(b3.branchId==='branch_b3','Third branch handover independently supported');
  await db.user.update({where:{id:actors[2].id},data:{fullName:'اسم جديد'}});
  check((await finance.report(range,actors[2])).withdrawals[0].createdByName===actors[2].fullName,'Renaming actor does not reprice/rewrite snapshot');
  await reject(db.ownerWithdrawal.create({data:{branchId:'branch_b1',requestKey:key(),ownerNameSnapshot:'مالك',usdMinor:-1,withdrawnAt:new Date(),createdById:owner.id,createdByName:owner.fullName}}),null,'Database negative-amount constraint');
  await Promise.all(Array.from({length:52},()=>draws.add(dto({withdrawnOn:'2026-10-02',usdMinor:100,sypNewMinor:0}),actors[1])));
  const p1=await finance.report({from:'2026-10-02',to:'2026-10-02',page:1},actors[1]),p2=await finance.report({from:'2026-10-02',to:'2026-10-02',page:2},actors[1]);
  check(p1.withdrawalCount===52 && p1.withdrawals.length===50 && p2.withdrawals.length===2,'Owner handover detail pagination50 covers every record');
  check(new Set([...p1.withdrawals,...p2.withdrawals].map(w=>w.id)).size===52 && JSON.stringify(p1.totals)===JSON.stringify(p2.totals),'Stable ordered pages retain full-period currency totals');
  check((await finance.report(range,{...owner,branchId:'branch_b3',branchCode:'b3'})).withdrawals[0].id===b3.id,'Owner can select another branch without combining its data');
  const client=new Client({connectionString:process.env.DATABASE_URL}); await client.connect();
  try {
    const before=await fingerprints(client), preview=await addDemoDirectory(client);
    check(preview.created===12 && preview.withdrawalsCreated===6 && !preview.committed,'Demo workers and authorized handovers verified in rollback preview');
    assert.deepEqual(await fingerprints(client),before); check(true,'Preview leaves all existing rows unchanged');
    const applied=await addDemoDirectory(client,{commit:true}), again=await addDemoDirectory(client,{commit:true});
    check(applied.created===12 && again.alreadyApplied,'Demo directory applied once, safe to retry');
    assert.deepEqual(await fingerprints(client),before); check(true,'Demo directory preserves original accounts, payments, expenses and workers');
    check((await client.query('SELECT count(*)::int n FROM "SalaryRecipient" WHERE id=ANY($1::text[])',[applied.recipientIds])).rows[0].n===12,'Four tagged, removable reference salary entries per branch');
    check((await client.query('SELECT count(*)::int n FROM "OwnerWithdrawal" WHERE id=ANY($1::text[])',[applied.withdrawalIds])).rows[0].n===6,'Two tagged cash handovers per branch, no salary payments');
    const demoReport=await finance.report({from:'2026-09-30',to:'2026-10-06',page:1},actors[0]);
    check(demoReport.totals.find(t=>t.currency==='USD').ownerWithdrawalMinor===10000 && demoReport.totals.find(t=>t.currency==='SYP_NEW').ownerWithdrawalMinor===250000,'Demo dual currency draws appear correctly in period totals');
  } finally { await client.end(); }
  console.log('COMPLETE',checks,'real isolated PostgreSQL owner-withdrawal/demo checks');
}
run().catch(e=>{ console.error(e);process.exitCode=1; }).finally(()=>db.$disconnect());
