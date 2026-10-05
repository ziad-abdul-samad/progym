// ADD ONLY. Deliberately has no update/delete/reset/cleanup operations.
// Run via a private wrapper with a pg-compatible Client. Never called by startup/seed.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

const BATCH = 'presentation_20261006';
const PREFIX = BATCH + '_';
const DAY = 86400000;
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
const id = (suffix) => PREFIX + suffix;
const dateOnly = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });
const offsets = [0, 6, 21, 38];
const protectedTables = [
  'Branch', 'User', 'MemberProfile', 'CoachProfile', 'CoachBranch', 'ShiftObserver',
  'MembershipPlan', 'Subscription', 'Payment', 'Expense', 'RegistrationRequest',
  'AttendanceRecord', 'CoachAssignment', 'MembershipAuditLog', 'AuditLog',
  'ProgressEntry', 'WorkoutPlan', 'WorkoutPlanItem', 'WorkoutLog', 'NutritionPlan',
  'NutritionMeal', 'NutritionFoodItem', 'GymSettings', 'FileAsset',
];

async function fingerprints(client) {
  const result = {};
  // Only digest/count leave Postgres; customer names, phone numbers and hashes do not.
  const selects = protectedTables.map((table) => {
    const column = table === 'CoachBranch' ? 'coachId' : 'id';
    return `SELECT '${table}' AS table_name,count(*)::int AS count,
      md5(coalesce(string_agg(to_jsonb(t)::text, '' ORDER BY to_jsonb(t)::text), '')) AS digest
      FROM ${quote(table)} t WHERE left(${quote(column)}, $1) <> $2`;
  });
  const { rows } = await client.query(selects.join(' UNION ALL '),[PREFIX.length,PREFIX]);
  for (const row of rows) result[row.table_name] = { count:row.count,digest:row.digest };
  return result;
}

async function insertRows(client, table, rows) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const values = [];
  const tuples = rows.map((row) => {
    assert.deepEqual(Object.keys(row), columns, 'Bulk row shape must match: ' + table);
    return '(' + columns.map((column) => {
      values.push(row[column]);
      return '$' + values.length;
    }).join(',') + ')';
  });
  await client.query(`INSERT INTO ${quote(table)} (${columns.map(quote).join(',')}) VALUES ${tuples.join(',')}`, values);
}

async function readCatalog(client) {
  const branches = (await client.query(`SELECT id,code,"nameAr" FROM "Branch"
    WHERE code IN ('b1','b2','b3') AND "isActive" ORDER BY code`)).rows;
  assert.equal(branches.length, 3, 'All three existing branches must be present');
  const plans = (await client.query(`SELECT * FROM "MembershipPlan"
    WHERE "branchId" = ANY($1::text[]) AND "isActive" AND "deletedAt" IS NULL
    ORDER BY "branchId",audience,"sortOrder",id`, [branches.map((b) => b.id)])).rows;
  const observers = (await client.query(`SELECT o.*,u."fullName" AS "receiverName"
    FROM "ShiftObserver" o JOIN "User" u ON u.id=o."userId"
    WHERE o."branchId"=ANY($1::text[]) AND o.status='ACTIVE' AND o."deletedAt" IS NULL
    AND u.status='ACTIVE' AND u.role='OBSERVER' ORDER BY o."branchId",o.audience,o.id`,
  [branches.map((b) => b.id)])).rows;
  for (const b of branches) for (const audience of ['MEN', 'WOMEN']) {
    assert.ok(plans.some((p) => p.branchId === b.id && p.audience === audience), 'Missing catalog ' + b.code + audience);
    assert.ok(observers.some((o) => o.branchId === b.id && o.audience === audience), 'Missing observer ' + b.code + audience);
  }
  for (const p of plans) {
    assert.ok(Number.isInteger(p.priceMinor) && p.priceMinor >= 0 && p.durationDays > 0);
    assert.ok(['USD', 'SYP_NEW', 'SYP'].includes(p.currency), 'Unsupported currency');
  }
  return { branches, plans, observers };
}

function buildRows(catalog, passwordHash, anchor = '2026-10-06') {
  assert.match(anchor, /^\d{4}-\d{2}-\d{2}$/);
  const base = new Date(anchor + 'T00:15:00+03:00');
  assert.equal(dateOnly(base), anchor, 'Invalid business date');
  assert.ok(base.getTime() <= Date.now(), 'Demo transactions must not be future dated');
  const rows = Object.fromEntries([
    'User', 'CoachProfile', 'CoachBranch', 'MemberProfile', 'Subscription', 'Payment',
    'RegistrationRequest', 'Expense', 'CoachAssignment', 'ProgressEntry', 'AttendanceRecord',
    'WorkoutPlan', 'WorkoutPlanItem', 'WorkoutLog', 'NutritionPlan', 'NutritionMeal',
    'NutritionFoodItem', 'MembershipAuditLog', 'AuditLog',
  ].map((key) => [key, []]));
  const credentials = [];
  const now = new Date();
  let seq = 0;
  const maleNames = ['أحمد', 'عمر', 'خالد', 'رامي', 'محمد', 'سامي', 'علاء', 'يوسف'];
  const femaleNames = ['نور', 'سارة', 'ليان', 'ريم', 'هبة', 'رنا', 'مريم', 'دانا'];
  const surnames = ['الحسن', 'الدرويش', 'الحموي', 'المصري', 'الخطيب', 'العلي'];
  function addUser(suffix, branch, audience, role, fullName, createdAt, status = 'ACTIVE') {
    seq++;
    const username = 'demo.261006.' + branch.code + '.' + suffix;
    const userId = id(branch.code + '_user_' + suffix);
    rows.User.push({ id:userId, username, phone:'+963000261006' + String(seq).padStart(3,'0'),
      fullName:fullName + ' — تجريبي', role, status, passwordHash, locale:'ar', createdAt, updatedAt:createdAt });
    credentials.push({ username, role, branch:branch.code, audience, status });
    return userId;
  }
  const overview = [];
  for (const branch of catalog.branches) {
    const counts = { branch:branch.code, players:0, coaches:0, receipts:0, expenses:0, pending:0 };
    const coaches = {};
    for (const audience of ['MEN','WOMEN']) {
      const suffix = audience === 'MEN' ? 'coach.m' : 'coach.w';
      const userId = addUser(suffix, branch, audience, 'COACH', audience === 'MEN' ? 'الكابتن أيمن' : 'الكابتن ندى', base);
      const coachId = id(branch.code + '_' + suffix);
      rows.CoachProfile.push({ id:coachId, userId, specialties:['لياقة عامة', 'تدريب مقاومة'],
        bioAr:'حساب تدريب تجريبي للعرض فقط؛ ليس مدرباً حقيقياً.', isPublic:false, createdAt:base, updatedAt:base });
      rows.CoachBranch.push({ coachId, branchId:branch.id, createdAt:base });
      coaches[audience] = coachId;
      counts.coaches++;
    }
    let playerNumber = 0;
    const coached = new Set();
    const branchPlans = catalog.plans.filter((p) => p.branchId === branch.id);
    for (const plan of branchPlans) for (let variant = 0; variant < offsets.length; variant++) {
      playerNumber++;
      const audience = plan.audience;
      const matchingObservers = catalog.observers.filter((o) => o.branchId === branch.id && o.audience === audience);
      const observer = matchingObservers[(playerNumber - 1) % matchingObservers.length];
      const names = audience === 'MEN' ? maleNames : femaleNames;
      const fullName = names[(playerNumber - 1) % names.length] + ' ' + surnames[Math.floor((playerNumber - 1) / names.length) % surnames.length] + ' ' + playerNumber;
      const suffix = 'p' + String(playerNumber).padStart(2,'0');
      const paidAt = new Date(base.getTime() - offsets[variant] * DAY);
      const endsAt = new Date(paidAt.getTime() + plan.durationDays * DAY);
      const status = endsAt.getTime() > now.getTime() ? 'ACTIVE' : 'EXPIRED';
      const userId = addUser(suffix, branch, audience, 'MEMBER', fullName, paidAt);
      const memberId = id(branch.code + '_member_' + suffix);
      const subscriptionId = id(branch.code + '_sub_' + suffix);
      const memberName = rows.User.at(-1).fullName;
      const weight = 60 + (playerNumber % 30);
      rows.MemberProfile.push({ id:memberId,userId,homeBranchId:branch.id,
        memberCode:'DEMO-261006-' + branch.code.toUpperCase() + '-' + suffix.toUpperCase(),
        dateOfBirth:'1996-05-12',gender:audience === 'MEN' ? 'MALE' : 'FEMALE',heightCm:168 + playerNumber % 15,
        currentWeightKg:weight,fitnessGoal:'لياقة عامة — بيانات تجريبية',healthNotes:'بيانات عرض وهمية وليست معلومات صحية حقيقية',
        joinedAt:paidAt,createdAt:paidAt,updatedAt:paidAt });
      rows.Subscription.push({ id:subscriptionId,memberId,branchId:branch.id,planId:plan.id,status,
        startsAt:paidAt,endsAt,notes:'تجريبي — ' + BATCH,createdAt:paidAt,updatedAt:paidAt });
      rows.Payment.push({ id:id(branch.code + '_payment_' + suffix),requestKey:id(branch.code + '_receipt_' + suffix),
        branchIdSnapshot:branch.id,planIdSnapshot:plan.id,planNameSnapshot:plan.nameAr,
        durationDaysSnapshot:plan.durationDays,memberIdSnapshot:memberId,memberNameSnapshot:memberName,
        receiverNameSnapshot:observer.receiverName,observerNameSnapshot:observer.fullName,
        subscriptionId,receivedById:observer.userId,amountMinor:plan.priceMinor,currency:plan.currency,
        method:'CASH',status:'PAID',paidAt,notes:'إيصال تجريبي للعرض فقط — ' + BATCH,createdAt:paidAt,updatedAt:paidAt });
      rows.RegistrationRequest.push({ id:id(branch.code + '_registration_' + suffix),memberId,branchId:branch.id,
        status:'APPROVED',reviewerId:observer.userId,observerId:observer.id,requestedDays:plan.durationDays,
        approvedDays:plan.durationDays,reviewReason:'طلب تجريبي معتمد للعرض فقط',
        claimTokenHash:randomBytes(32).toString('hex'),
        claimedAt:paidAt,reviewedAt:paidAt,createdAt:paidAt,updatedAt:paidAt });
      rows.MembershipAuditLog.push({ id:id(branch.code + '_membership_audit_' + suffix),subscriptionId,memberId,
        branchId:branch.id,adminId:observer.userId,adminName:observer.receiverName,observerId:observer.id,
        observerName:observer.fullName,action:'CREATE',previousValue:JSON.stringify({}),
        newValue:JSON.stringify({ status,startsAt:paidAt,endsAt,planId:plan.id,demoBatch:BATCH }),
        reason:'تجريبي — ليس دفعاً حقيقياً',createdAt:paidAt });
      const visits = [paidAt];
      if (status === 'ACTIVE' && variant > 0) visits.push(base);
      visits.forEach((visit, index) => rows.AttendanceRecord.push({ id:id(branch.code + '_attendance_' + suffix + '_' + index),
        memberId,branchId:branch.id,source:'MANUAL',checkedInAt:visit,attendanceDate:dateOnly(visit),
        notes:'حضور تجريبي — ' + BATCH,createdAt:visit }));
      rows.ProgressEntry.push({ id:id(branch.code + '_progress_' + suffix),memberId,authorUserId:userId,
        measuredAt:paidAt,weightKg:weight,notes:'قياس تجريبي للعرض فقط',createdAt:paidAt,updatedAt:paidAt });
      if (variant === 0 && plan.durationDays >= 15 && !coached.has(audience)) {
        coached.add(audience);
        const coachId = coaches[audience];
        const workoutId = id(branch.code + '_workout_' + suffix);
        const nutritionId = id(branch.code + '_nutrition_' + suffix);
        rows.CoachAssignment.push({ id:id(branch.code + '_assignment_' + suffix),memberId,coachId,branchId:branch.id,
          status:'ACTIVE',startedAt:paidAt,coachingStartsAt:paidAt,coachingEndsAt:endsAt,planRequirement:'BOTH',
          reminderEnabled:true,notes:'تكليف مدرب تجريبي',createdAt:paidAt,updatedAt:paidAt });
        rows.WorkoutPlan.push({ id:workoutId,memberId,coachId,status:'ACTIVE',title:'برنامج تجريبي — قوة ولياقة',
          notes:'برنامج وهمي للعرض فقط وليس توصية تدريبية',startsAt:paidAt,endsAt,
          seriesId:workoutId,version:1,createdAt:paidAt,updatedAt:paidAt });
        ['تمرين سكوات','ضغط صدر','سحب ظهر'].forEach((exerciseName,index) => {
          const itemId = id(branch.code + '_workout_item_' + suffix + '_' + index);
          rows.WorkoutPlanItem.push({ id:itemId,planId:workoutId,exerciseName,dayIndex:0,dayTitle:'اليوم الأول',sortOrder:index,
            sets:3,reps:'12,10,8',load:'20 كغ',restSeconds:60,notes:'تجريبي',createdAt:paidAt,updatedAt:paidAt });
          rows.WorkoutLog.push({ id:id(branch.code + '_workout_log_' + suffix + '_' + index),memberId,planItemId:itemId,
            source:'COACH_PLAN',performedAt:paidAt,setsCompleted:3,repsCompleted:'12,10,8',load:'20',
            completed:true,isPersonalRecord:false,notes:'سجل تجريبي',createdAt:paidAt,updatedAt:paidAt });
        });
        rows.NutritionPlan.push({ id:nutritionId,memberId,coachId,status:'ACTIVE',title:'خطة تغذية تجريبية',
          notes:'بيانات عرض وهمية وليست نصيحة غذائية',targetCalories:2200,startsAt:paidAt,endsAt,
          seriesId:nutritionId,version:1,createdAt:paidAt,updatedAt:paidAt });
        ['الإفطار','الغداء','العشاء'].forEach((name,index) => {
          const mealId = id(branch.code + '_meal_' + suffix + '_' + index);
          rows.NutritionMeal.push({ id:mealId,planId:nutritionId,name,sortOrder:index,createdAt:paidAt,updatedAt:paidAt });
          rows.NutritionFoodItem.push({ id:id(branch.code + '_food_' + suffix + '_' + index),mealId,name:['شوفان وحليب','أرز ودجاج','سلطة ولبن'][index],
            quantity:'حصة تجريبية',calories:[500,700,400][index],sortOrder:0,createdAt:paidAt,updatedAt:paidAt });
        });
      }
      counts.players++;
      counts.receipts++;
    }
    for (const audience of ['MEN','WOMEN']) {
      const suffix = 'pending.' + (audience === 'MEN' ? 'm' : 'w');
      const userId = addUser(suffix,branch,audience,'MEMBER',audience === 'MEN' ? 'كريم طلب جديد' : 'لينا طلب جديد',base,'INACTIVE');
      const memberId = id(branch.code + '_member_' + suffix);
      rows.MemberProfile.push({ id:memberId,userId,homeBranchId:branch.id,
        memberCode:'DEMO-261006-' + branch.code.toUpperCase() + '-' + suffix.toUpperCase(),
        dateOfBirth:'1999-03-20',gender:audience === 'MEN' ? 'MALE' : 'FEMALE',heightCm:170,currentWeightKg:70,
        fitnessGoal:'تجربة قبول طلب التسجيل',healthNotes:'بيانات وهمية',joinedAt:base,createdAt:base,updatedAt:base });
      rows.RegistrationRequest.push({ id:id(branch.code + '_registration_' + suffix),memberId,branchId:branch.id,
        status:'PENDING',reviewerId:null,observerId:null,requestedDays:30,approvedDays:null,reviewReason:null,
        claimTokenHash:randomBytes(32).toString('hex'),
        claimedAt:null,reviewedAt:null,createdAt:base,updatedAt:base });
      counts.players++;
      counts.pending++;
    }
    const expenseSamples = [
      ['شراء مواد تنظيف',45000,0],['صيانة جهاز المشي',120000,2],['تبديل مرآة في الصالة',95000,5],
      ['مياه للشرب',25000,10],['إصلاح الإنارة',70000,18],['صيانة الأوزان والمقاعد',140000,25],
      ['مستلزمات استقبال',30000,32],['قطع غيار أجهزة التدريب',85000,38],
    ];
    expenseSamples.forEach(([title,amountMinor,offset],index) => {
      const observers = catalog.observers.filter((o) => o.branchId === branch.id);
      const observer = observers[index % observers.length];
      const spentAt = new Date(base.getTime() - offset * DAY);
      rows.Expense.push({ id:id(branch.code + '_expense_' + index),requestKey:id(branch.code + '_expense_key_' + index),
        branchId:branch.id,title:title + ' — تجريبي',notes:'مبلغ وهمي للعرض فقط — ' + BATCH,amountMinor,
        currency:'SYP_NEW',spentAt,createdById:observer.userId,createdByName:observer.receiverName,createdAt:spentAt });
      counts.expenses++;
    });
    if (branch.code === 'b1') {
      const observer = catalog.observers.find((o) => o.branchId === branch.id && o.audience === 'MEN');
      rows.Expense.push({ id:id('b1_expense_usd'),requestKey:id('b1_expense_key_usd'),branchId:branch.id,
        title:'صيانة إضافية بالدولار — تجريبي',notes:'مبلغ وهمي للعرض فقط — ' + BATCH,amountMinor:1000,
        currency:'USD',spentAt:base,createdById:observer.userId,createdByName:observer.receiverName,createdAt:base });
      counts.expenses++;
    }
    overview.push(counts);
  }
  for (const expense of rows.Expense) rows.AuditLog.push({ id:id('audit_' + expense.id.slice(PREFIX.length)),
    actorId:expense.createdById,branchId:expense.branchId,action:'CREATE',entityType:'Expense',entityId:expense.id,
    metadata:JSON.stringify({ demoBatch:BATCH, demo:true }),createdAt:expense.createdAt });
  return { rows, credentials, overview, anchor, range:{ from:dateOnly(new Date(base.getTime()-38*DAY)),to:anchor } };
}

async function applyBatch(client, { passwordHash, anchor, dryRun = true }) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  let committed = false;
  try {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [BATCH]);
    const existing = await client.query('SELECT metadata FROM "AuditLog" WHERE id=$1', [id('manifest')]);
    if (existing.rowCount) {
      await client.query('ROLLBACK');
      return { alreadyApplied:true, manifest:existing.rows[0].metadata };
    }
    const before = await fingerprints(client);
    const catalog = await readCatalog(client);
    const data = buildRows(catalog,passwordHash,anchor);
    // No ON CONFLICT/upsert: any collision aborts the entire batch, never changes old rows.
    for (const [table, rows] of Object.entries(data.rows)) await insertRows(client,table,rows);
    const after = await fingerprints(client);
    assert.deepEqual(after,before,'Pre-existing records must be byte-for-byte unchanged');
    const manifest = { batch:BATCH,prefix:PREFIX,anchor:data.anchor,range:data.range,overview:data.overview,
      counts:Object.fromEntries(Object.entries(data.rows).map(([table,rows])=>[table,rows.length])),
      rows:Object.fromEntries(Object.entries(data.rows).map(([table,rows])=>[table,rows.map((r)=>r.id || { coachId:r.coachId,branchId:r.branchId })])),
      originalFingerprints:before,createdAt:new Date().toISOString(),
      cleanupPolicy:'Separate explicit request required. Start from these exact user/member/coach IDs and follow their dependencies, including later-created demo-related records. Never delete by name, amount or date alone. Never remove shared plans/branches/observers/exercises.' };
    await insertRows(client,'AuditLog',[{ id:id('manifest'),action:'CREATE',entityType:'PresentationDemoBatch',
      entityId:BATCH,metadata:JSON.stringify(manifest),createdAt:new Date() }]);
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    committed = !dryRun;
    return { dryRun,committed,manifest,credentials:data.credentials };
  } catch (error) {
    if (!committed) await client.query('ROLLBACK').catch(()=>{});
    throw error;
  }
}

module.exports = { BATCH, PREFIX, fingerprints, readCatalog, buildRows, applyBatch };
