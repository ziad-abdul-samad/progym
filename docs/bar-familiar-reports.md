# Branch bar and familiar reception reports

## Confirmed business rules

- New Syrian pounds and USD remain separate; historical currency/price records are not converted or repriced.
- Club income is paid subscriptions/renewals in the selected Damascus-date range. Counts are paid transactions, not unique people. Current unused plans show zero; paid old price versions remain separate.
- Paid salaries appear by name (including historical name/job snapshots) and are counted ONCE in club expenses. Saved reference salaries are not automatic expenses; saved unpaid names can show zero. Trainer/boxing commissions are deferred.
- Bar products have up to10 labeled price presets. The sale records the actual collected unit amount × integer quantity, immutable product/price label/currency/actor snapshots, and cash date. Prices may be overridden explicitly for a sale. Editing/archiving products never rewrites cash history.
- Observers record one collected-sales batch with multiple quantity/actual-price groups (e.g.10pieces at50 and20pieces at75); the entire batch commits once or not at all. This is not unsold inventory valuation. No sale-by-sale entry required; older individual sales remain intact.
- **مجموع بار جديد** = still-unhanded-over collected sales dated within the selected period, as of its end. **مجموع بار قديم** = collected sales before the period, still not handed over as of its end. **مجموع بار قديم وجديد** = their sum. Saved historical prices are never replaced by current catalog prices. Future-dated handovers do not affect an earlier report.
- Owner handovers now include optional bar-USD/bar-new-SYP portions WITHIN (never added to) their total amounts. Allocation consumes the oldest unsettled sale first, then newer sales, allows partial handovers, and is branch/currency isolated. Generic historical handovers default to unclassified0bar; never infer their source. Voiding a handover restores its exact allocations; a settled sale cannot be voided first. These gross unpaid-to-owner sales are NOT the drawer balance after expenses; bar expenses stay separate.
- Bar expenses are a separate ledger, not duplicated as club expenses. Historical explicit OPENING cash declarations stay readable as manual cash, never reclassified as old bar sales or new revenue. Historical cash-anchor fields remain for compatibility, but the report's three requested totals no longer use them.
- Final period computation: club income − club expenses + bar period income − bar expenses. In8Azar/B3 only, subtract `max(0, club net) × 0.03`, rounded to minor units, as the original example. Then subtract branch-owner handovers. Finally display `remaining ÷ 2` for all branches, without naming the owners or the0.03 line. The one-minor-unit rounding difference, if any, is explicitly unallocated. Beginning cash never becomes new profit to divide again.
- Shared content supplies screen/PDF/copyable message in familiar order: employee salaries → club expenses → bar expenses/daily sales/balances → subscriptions by men/women/plan/actual paid price → totals/equations. Old payment audience was not originally stored; legacy classification from the current catalog is explicitly disclosed. Future receipts store audience snapshots.

## Safety and correction

- Branch scope is resolved from the authenticated actor, never a body branchId. Only ADMIN/OBSERVER can use finance endpoints.
- Sale/cash forms use stable retry keys; changed retry payloads conflict rather than recording twice. Products use optimistic revision checks with locked rows. Corrections retain the original row and require audited void reasons; database triggers reject edits to cash snapshots.
- Batch retries compare the exact normalized request and return the original lines even after product edits/archive. A stale/invalid line rolls the whole batch back. Branch settlement locking prevents two observers handing over the same sales; immutable allocations link to the existing owner handover, with database guards on allocation limits and settled-sale corrections.
- Salary/club/bar expenses, owner handovers and opening funds are non-overlapping categories. This is period cash bookkeeping, not an assertion of the actual total gym drawer balance or legal tax treatment.
- Migration is additive and preserves all existing customer/demo users, subscriptions, receipts, prices and expenses.

## Authorized bar demonstration data

`backend/scripts/bar-demo.cjs` is standalone, ADD ONLY, never run by seed/startup. Default preview rolls back; explicit commit requires user authorization (granted for this task).

- Batch `bar_demo_20261012`:3 tagged products per branch (energy bar, water, protein drink), two preset prices each;24 sales per branch across Oct6/9/11/12 with player/staff prices; two bar expenses and one explicit opening per branch. Total9products,72sales,9cash entries plus immutable audit manifest.
- Original/previous-demo row digests are compared inside the transaction. Retry detects its persistent DemoBatch manifest and does not duplicate the batch. Private manifests stay ignored.
- Later removal requires explicit user instruction, exact manifest IDs and dependency preview. Do not remove any user-created sale of demo products, edits, or linked customer activity without new direction. Do not reset/reseed any customer database. Preserve audit manifests and previous demo batches.
