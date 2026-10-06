# Owner cash handovers

- Branch-scoped, dated cash movements, separate from operating expenses. One recorded visit can contain USD and new Syrian pounds, without currency conversion.
- Record only money actually handed over, not an owner's phone request. The observer identity, receiver name, cash date and recording time are preserved. Corrections are audited voids with a reason; records are not deleted or resurrected by a network retry.
- Reports retain operating net (`incomeMinor - expenseMinor`), and also show owner withdrawals and cash movement after draws. This is the selected period's movement, NOT the drawer balance: opening cash and other unrecorded movements are unknown.
- No change to historic receipts, prices, expenses or salary payments. USD, SYP_NEW and any legacy SYP remain independent.

## Tagged presentation salary directory

`backend/scripts/payroll-directory-demo.cjs` is add-only and never called by startup or seed. Explicit user authorization is required to apply it to production. Its default execution rolls back a preview.

- Batch: `payroll_directory_demo_20261006`, four reference salary recipients per branch, names visibly marked `تجريبي`.
- A database `DemoBatch` audit manifest records the exact directory IDs. These are NOT website login accounts and do NOT create salary payments/expenses.
- Follow-up user authorization adds two tagged demo owner handovers per branch (today and six days before). B1 today includes USD100 + newSYP1000; each branch also has newSYP1500 six days before. B2/B3 today have newSYP1000. These DO reduce demo cash movement and are identified by separate exact withdrawal IDs in the manifest.
- Retry detects the existing manifest and creates nothing. Existing customer and prior presentation rows are fingerprint-checked and preserved.
- Removal is deferred until explicit user instruction. First preview references from `Expense` and any later edits/payments. Do not delete dependent customer activity or mass-remove by name. If untouched and unreferenced, exact manifest directory/withdrawal IDs can be removed in a separately audited cleanup transaction; preserve the manifest/history. Never run a reset or reseed.
