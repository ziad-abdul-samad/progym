// Explicitly authorized presentation data. ADD ONLY; never invoked by seed/startup.
// Reference salaries are not paid. Separately authorized demo owner handovers affect demo cash totals.
const assert = require('node:assert/strict');
const BATCH = 'payroll_directory_demo_20261006';
const PREFIX = BATCH + '_';
const protectedTables = ['Branch','User','ShiftObserver','MemberProfile','CoachProfile','Subscription','Payment','MembershipPlan','Expense','SalaryRecipient','OwnerWithdrawal','AuditLog'];
async function fingerprints(client) {
  const result = {};
  for (const table of protectedTables) result[table] = (await client.query(
    `SELECT count(*)::int AS count, md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) AS digest FROM "${table}" t WHERE left(id,$1)<>$2`, [PREFIX.length,PREFIX])).rows[0];
  return result;
}
async function addDemoDirectory(client, { commit = false } = {}) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  try {
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, [BATCH]);
    const existing = (await client.query('SELECT metadata FROM "AuditLog" WHERE id=$1', [PREFIX+'manifest'])).rows[0];
    if (existing) { await client.query('ROLLBACK'); return { alreadyApplied:true, ...existing.metadata }; }
    const before = await fingerprints(client);
    const branches = (await client.query(`SELECT id,code FROM "Branch" WHERE code IN ('b1','b2','b3') AND "isActive" ORDER BY code`)).rows;
    assert.equal(branches.length,3);
    const owner = (await client.query(`SELECT id FROM "User" WHERE role='ADMIN' AND status='ACTIVE' ORDER BY "createdAt",id LIMIT 1`)).rows[0];
    assert.ok(owner,'An existing owner is required');
    const names = [
      ['عمر الحسن','نور الخطيب','سامي العلي','محمد الدرويش'],
      ['خالد المصري','ريم الحموي','أحمد السالم','يوسف الحسن'],
      ['رامي الخطيب','ليان العلي','علاء الدرويش','مازن المصري'],
    ];
    const jobs = ['مراقب استقبال','مراقبة استقبال','عامل نظافة','عامل صيانة'];
    const salaryMinor = [750000,750000,400000,10000], currencies = ['SYP_NEW','SYP_NEW','SYP_NEW','USD'];
    const ids = [], withdrawalIds = [], now = new Date();
    for (const [b,branch] of branches.entries()) for (let i=0;i<4;i++) {
      const id = PREFIX+branch.code+'_'+i, name = names[b][i]+' — تجريبي';
      await client.query(`INSERT INTO "SalaryRecipient" (id,"branchId",name,"nameKey","jobTitle","salaryMinor",currency,"createdById","createdByName","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
        [id,branch.id,name,name.toLocaleLowerCase('ar'),jobs[i],salaryMinor[i],currencies[i],owner.id,'إضافة بيانات العرض التجريبية',now]);
      await client.query(`INSERT INTO "AuditLog" (id,action,"actorId","branchId","entityType","entityId",metadata,"createdAt") VALUES ($1,'CREATE',$2,$3,'SalaryRecipient',$4,$5::jsonb,$6)`,
        [PREFIX+'audit_'+branch.code+'_'+i,owner.id,branch.id,id,JSON.stringify({ batch:BATCH, demo:true, referenceOnly:true, name, salaryMinor:salaryMinor[i], currency:currencies[i] }),now]);
      ids.push(id);
    }
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Damascus'}).format(now);
    const cashDate = new Date(today+'T00:00:00+03:00');
    for (const branch of branches) {
      const observer = (await client.query(`SELECT u.id,u."fullName" FROM "ShiftObserver" o JOIN "User" u ON u.id=o."userId" WHERE o."branchId"=$1 AND o.status='ACTIVE' AND o."deletedAt" IS NULL AND u.role='OBSERVER' AND u.status='ACTIVE' ORDER BY o.id LIMIT 1`,[branch.id])).rows[0];
      assert.ok(observer,'Existing observer required for '+branch.code);
      for (let i=0;i<2;i++) {
        const id=PREFIX+'withdrawal_'+branch.code+'_'+i, withdrawnAt = new Date(cashDate.getTime()-i*6*86400000);
        const usdMinor=branch.code==='b1' && i===0 ? 10000 : 0, sypNewMinor=i===0 ? 100000 : 150000;
        await client.query(`INSERT INTO "OwnerWithdrawal" (id,"branchId","requestKey","ownerNameSnapshot","usdMinor","sypNewMinor","withdrawnAt",notes,"createdById","createdByName","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [id,branch.id,id,'مالك النادي — تجريبي',usdMinor,sypNewMinor,withdrawnAt,'سحب تجريبي للعرض فقط — '+BATCH,observer.id,observer.fullName,now]);
        await client.query(`INSERT INTO "AuditLog" (id,action,"actorId","branchId","entityType","entityId",metadata,"createdAt") VALUES ($1,'CREATE',$2,$3,'OwnerWithdrawal',$4,$5::jsonb,$6)`,
          [PREFIX+'audit_withdrawal_'+branch.code+'_'+i,observer.id,branch.id,id,JSON.stringify({batch:BATCH,demo:true,usdMinor,sypNewMinor,withdrawnAt}),now]);
        withdrawalIds.push(id);
      }
    }
    const manifest = { batch:BATCH, recipientIds:ids, withdrawalIds, created:ids.length, salaryReferenceOnly:true, paymentsCreated:0, withdrawalsCreated:withdrawalIds.length };
    await client.query(`INSERT INTO "AuditLog" (id,action,"actorId","entityType","entityId",metadata,"createdAt") VALUES ($1,'CREATE',$2,'DemoBatch',$3,$4::jsonb,$5)`,[PREFIX+'manifest',owner.id,BATCH,JSON.stringify(manifest),now]);
    assert.deepEqual(await fingerprints(client),before,'Existing customer/demo data must stay unchanged');
    await client.query(commit ? 'COMMIT' : 'ROLLBACK');
    return { ...manifest, committed:commit };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
module.exports = { addDemoDirectory, BATCH, PREFIX, fingerprints };
