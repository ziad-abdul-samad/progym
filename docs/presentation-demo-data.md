# Owner / observer presentation dataset

This is an **add-only, deliberately invoked** generator, not the application's seed.
Batch ID: `presentation_20261006`; every inserted entity ID starts with that prefix.
Usernames start with `demo.261006.` and names/expenses explicitly say `تجريبي`.
The batch is intended for the existing deployed database at the user's explicit request.

## Safety and usage

- `backend/scripts/presentation-demo.cjs` exports `applyBatch(pgCompatibleClient, options)`.
- Default `dryRun:true` executes all insert/constraint checks then rolls back. Only explicit `dryRun:false` commits.
- Supply a securely generated Argon2 password hash, never production credentials in source.
- The generator only INSERTs. It never updates old rows, prices, passwords or seed data.
- Existing-row digests/counts across 24 relevant tables are compared inside the transaction.
- One transaction and one batch advisory lock protect atomicity and concurrent reruns.
- A stored `PresentationDemoBatch` AuditLog manifest prevents repeat runs from duplicating data.
- The manifest stores exact inserted IDs, counts, business-date range and original digests, **not passwords**.
- Private local credentials and manifests live in ignored `test-results/`. Do not upload these files.
- Paid receipts snapshot the current branch-specific price/currency/duration and audience-matched observer.
- All three branches receive men's/women's players, non-public coaches, coached examples with training/nutrition,
  daily attendance, progress entries, two pending registration requests, receipts and expenses.
- Dates cover today, last week, last month and an older period. Currencies remain separate; no invented exchange rates.
- These amounts are deliberately included in live reports during the demo. They are **not real revenue or expenses**.

## Future removal — not performed by this task

Wait for the user's separate explicit request. Read the DB manifest (audit ID
`presentation_20261006_manifest`) and private local copy. Resolve dependencies from exact
manifest User / MemberProfile / CoachProfile IDs, not editable names, dates or amounts.

Include later demonstration actions belonging to these demo identities: new subscriptions,
payments, attendance, change requests, chat history, coach assignments/plans/logs, refresh
sessions, notifications, owned file assets and audit rows referencing their exact IDs.
For Expense records without a user FK, use exact manifest IDs. Extra expenses manually
created during presentations must be explicitly identified/marked before deleting them.

Preview counts/IDs first and fail closed for mixed real/demo dependencies. Do not delete
shared branches, membership offers, observers, owner accounts or exercise-library records.
Delete child records in FK-safe order inside one transaction; retain a private removal
manifest and verify original customer/account data. Never run the generic demo-seed cleanup.

## Local verification

Only against an isolated migrated PostgreSQL database on `127.0.0.1:55434`:

```
node backend/test/presentation-demo.integration.cjs
```

Set `DATABASE_URL` explicitly to that disposable database. Test covers dry-run rollback,
original-row preservation, atomic/idempotent insertion, audience/price snapshots and actual
FinanceService daily/monthly/full-range reports with separate currency totals.
