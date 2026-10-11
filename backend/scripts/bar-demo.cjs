// ADD ONLY and opt-in, never called by seed/startup. All new rows visibly tagged for later exact-ID cleanup.
const assert=require('node:assert/strict');
const BATCH='bar_demo_20261012',PREFIX=BATCH+'_';
const tables=['User','Branch','ShiftObserver','MemberProfile','Subscription','Payment','MembershipPlan','SalaryRecipient','Expense','OwnerWithdrawal','BarProduct','BarSale','BarCashEntry','AuditLog'];
async function fingerprints(client) {
  const result={};
  const sql=tables.map(table=>`SELECT '${table}' AS table_name,count(*)::int count,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) digest FROM "${table}" t WHERE left(id,$1)<>$2`).join(' UNION ALL ');
  for(const row of (await client.query(sql,[PREFIX.length,PREFIX])).rows)result[row.table_name]={count:row.count,digest:row.digest};
  return result;
}
async function addBarDemo(client,{commit=false}={}) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  try {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[BATCH]);
    const old=(await client.query('SELECT metadata FROM "AuditLog" WHERE id=$1',[PREFIX+'manifest'])).rows[0];
    if(old){await client.query('ROLLBACK');return {alreadyApplied:true,...old.metadata};}
    const before=await fingerprints(client),now=new Date(),anchor=new Date('2026-10-12T00:00:00+03:00');
    assert.ok(anchor<=now,'Demo cash date must not be future dated');
    const branches=(await client.query(`SELECT id,code FROM "Branch" WHERE code IN ('b1','b2','b3') AND "isActive" ORDER BY code`)).rows;
    assert.equal(branches.length,3);
    const manifest={batch:BATCH,products:[],sales:[],cashEntries:[],auditIds:[],anchor:'2026-10-12'};
    async function audit(actor,branch,kind,id,metadata){const aid=PREFIX+'audit_'+id.slice(PREFIX.length);await client.query(`INSERT INTO "AuditLog"(id,action,"actorId","branchId","entityType","entityId",metadata,"createdAt") VALUES ($1,'CREATE',$2,$3,$4,$5,$6::jsonb,$7)`,[aid,actor.id,branch.id,kind,id,JSON.stringify({batch:BATCH,demo:true,...metadata}),now]);manifest.auditIds.push(aid);}
    for(const branch of branches) {
      const actor=(await client.query(`SELECT u.id,u."fullName" FROM "ShiftObserver" o JOIN "User" u ON u.id=o."userId" WHERE o."branchId"=$1 AND o.status='ACTIVE' AND o."deletedAt" IS NULL AND u.role='OBSERVER' AND u.status='ACTIVE' ORDER BY o.id LIMIT 1`,[branch.id])).rows[0];
      assert.ok(actor,'Existing branch observer required');
      const names=['لوح طاقة','مياه','مشروب بروتين'],player=[7500,2500,10000],staff=[5000,2000,8500];
      for(let i=0;i<3;i++) {
        const id=PREFIX+branch.code+'_product_'+i,name=names[i]+' — تجريبي',prices=[{label:'لاعب',unitPriceMinor:player[i]},{label:'مراقب / موظف',unitPriceMinor:staff[i]}];
        await client.query(`INSERT INTO "BarProduct"(id,"branchId",name,"nameKey",currency,prices,"createdAt","updatedAt") VALUES ($1,$2,$3,$3,'SYP_NEW',$4::jsonb,$5,$5)`,[id,branch.id,name,JSON.stringify(prices),now]);manifest.products.push(id);await audit(actor,branch,'BarProduct',id,{prices});
        for(const offset of [0,1,3,6])for(let j=0;j<2;j++) {
          const sid=PREFIX+branch.code+'_sale_'+i+'_'+offset+'_'+j,quantity=(i+offset+j)%4+1,unit=prices[j].unitPriceMinor,soldAt=new Date(anchor.getTime()-offset*86400000);
          await client.query(`INSERT INTO "BarSale"(id,"branchId","productId","requestKey","productNameSnapshot","priceLabelSnapshot",quantity,"unitPriceMinor","amountMinor",currency,"soldAt",notes,"createdById","createdByName","createdAt") VALUES ($1,$2,$3,$1,$4,$5,$6,$7,$8,'SYP_NEW',$9,$10,$11,$12,$13)`,[sid,branch.id,id,name,prices[j].label,quantity,unit,quantity*unit,soldAt,'بيع تجريبي للعرض فقط — '+BATCH,actor.id,actor.fullName,now]);manifest.sales.push(sid);await audit(actor,branch,'BarSale',sid,{quantity,unitPriceMinor:unit,amountMinor:quantity*unit});
        }
      }
      for(const [suffix,kind,title,amount,offset] of [['opening','OPENING','رصيد بار سابق — تجريبي',120000,7],['stock','EXPENSE','شراء منتجات بار — تجريبي',70000,6],['repair','EXPENSE','صيانة براد البار — تجريبي',15000,0]]) {
        const id=PREFIX+branch.code+'_cash_'+suffix,spentAt=new Date(anchor.getTime()-offset*86400000);
        await client.query(`INSERT INTO "BarCashEntry"(id,"branchId","requestKey",kind,title,"amountMinor",currency,"spentAt",notes,"createdById","createdByName","createdAt") VALUES ($1,$2,$1,$3,$4,$5,'SYP_NEW',$6,$7,$8,$9,$10)`,[id,branch.id,kind,title,amount,spentAt,'بيانات تجريبية فقط — '+BATCH,actor.id,actor.fullName,now]);manifest.cashEntries.push(id);await audit(actor,branch,'BarCashEntry',id,{kind,amountMinor:amount});
      }
    }
    const owner=(await client.query(`SELECT id FROM "User" WHERE role='ADMIN' AND status='ACTIVE' ORDER BY "createdAt",id LIMIT 1`)).rows[0];assert.ok(owner);
    await client.query(`INSERT INTO "AuditLog"(id,action,"actorId","entityType","entityId",metadata,"createdAt") VALUES ($1,'CREATE',$2,'DemoBatch',$3,$4::jsonb,$5)`,[PREFIX+'manifest',owner.id,BATCH,JSON.stringify(manifest),now]);
    assert.deepEqual(await fingerprints(client),before,'All existing customer and previous demo records must remain unchanged');
    await client.query(commit?'COMMIT':'ROLLBACK');return {committed:commit,...manifest};
  }catch(e){await client.query('ROLLBACK');throw e;}
}
module.exports={addBarDemo,fingerprints,BATCH,PREFIX};
