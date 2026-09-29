# Branch accounting rollout — 2026-09-29

## Authorized scope
- Branch-specific editable subscription offers: B1 daily 300.00 new SYP / monthly USD 30; B2 daily 300.00 / 15 days 1400.00 / 30 days 2000.00 / military 30 days 1400.00 new SYP; B3 daily 300.00 / 15 days 1750.00 / 30 days 2000.00 new SYP.
- Observer chooses paid plan during registration approval, renewal and branch transfer. Selecting/confirming records receipt of payment. Owner and branch observers manage offers and expenses.
- Immutable receipt snapshots (price, currency, duration, plan name, member and receiver). Changes to catalog prices must never reprice history. Separate USD/new-SYP/legacy-SYP totals; no invented exchange rates.
- Expense ledger: description, amount, currency, actual expense date, actor; audited corrections.
- Branch reports: income/expenses/net by currency, plan counts and receipts, expense details; separate subscriber list with names, purchased plan and payment date; date range and today/7 days/30 days presets. Arabic polished print/PDF.
- Optional registration photo in both client and server.
- Restore JolyUI expanded-map interaction and remove single-branch-only contact hero/details. Additional precise map URLs requested from user for B2 and B3; do not invent coordinates.
- Preserve existing production users, subscriptions and payment amounts. Additive migrations only. No Instagram files.

## State
- Previous public branch edit committed/deployed as 2e1f3d6; production contact HTTP 200 confirmed with branch names and OSM iframe. User now requests JolyUI instead.
- Inspected membership/payment/report/auth code. Existing plans are global, payments lack snapshots, add-days incorrectly records income, registration approval is not a single transaction. Address these in implementation.
- Existing prior backend deployments failed in August; investigate deployment logs with currently available Render connector before production rollout.
- Implemented branch plans + audited edits; immutable payment snapshots; transactional approval/renewal/transfer with retry keys; non-billable day adjustments.
- Implemented audited expense ledger with dated entries and void reasons; branch financial/subscriber reports with paginated details, currency separation and RTL canvas PDF; retained owner operational reports.
- Registration photo optional in client/server. Public contact now shows all three JolyUI-style expandable maps. User explicitly approved using Inshaat's coordinates for ALL THREE temporarily.
- Verified backend/frontend builds, lint and typecheck (before final cleanup), existing 26 tests, and 24 real PostgreSQL integration checks in isolated localhost:55434/accounting_v2. No production financial test writes.
- Current test fixture login names are printed by backend/test/accounting.integration.cjs; disposable test password is inside that script. Never use it in production.
- Prior Render concern resolved: connector confirmed commit 2e1f3d6 live on 2026-09-28.
- Final migration applied to a fresh isolated database accounting_final, including rolling-deploy receipt identity trigger; all 24 integration checks passed again.
- Existing unit tests: backend 26 (8 files) + frontend 4. Full Next build passed with 171 routes. Final post-polish build/lint in progress.
- Mobile report verified at 390px (document width = viewport); PDF financial output rendered with Poppler and both pages visually checked. Artifacts are local ignored test-results/accounting-financial.pdf, accounting-pdf-1.png, accounting-pdf-2.png.
- Contact page confirmed all three branches in hero/address/footer and three expandable tile maps. Final visual map check underway.
- Final frontend build (171 routes), frontend/backend typechecks, backend lint and git diff checks passed. Mobile map visually checked: all 27 tiles loaded, expandable cards work, 390px viewport has no horizontal overflow.
- Implementation and production deployment complete. Render is live and Vercel production ready on 3f1f9ce. No production fixture writes. Precise B2/B3 map locations remain user-supplied follow-up only.

## Assumptions
- Half month = 15 days; month = 30 days.
- Military discount is a separately selectable B2 plan, not an inferred personal attribute.
- Observers may view financial reports for their assigned branch under this new request; owner can select any branch.
- Days adjustments are administrative (reason required), not cash receipts. Paid extensions use renewal/plan purchase.

## Verified
- Branch isolation; inactive/other-branch plan rejected; price edit doesn't change historic report; registration approval atomic and no duplicate receipts; optional photo; expense date boundaries Damascus; separate currencies; financial PDF RTL; mobile width; additive migration; idempotent paid operations; production deployment.

## Resume protocol (explicit user request)
1. Read this file, then git status/diff. Do not restart finished implementation.
2. Recheck processes/ports: a stopped Codex turn may terminate tool-launched servers.
3. Local disposable PostgreSQL 18 cluster: C:/progym/test-results/accounting-pg, port 55434, database accounting_v2. Never run the integration script on production; it refuses non-local hosts/ports.
4. New fixture database is needed for another full integration run (initial seeded counts are asserted). Existing fixture is useful for UI checks.
5. Local UI test owner username: test.admin.b1.5d1641b9; B2 observer: test.observer.b2.5d1641b9. Password is the disposable one in backend/test/accounting.integration.cjs.
6. Deployment targets: GitHub ziad-abdul-samad/progym; working branch codex/public-auth-redesign (Render), main (Vercel). Render service srv-d95tjh5ckfvc73bpt790; public site https://progym-homs.vercel.app.
7. Accounting implementation committed and pushed as 3f1f9ce9007dcebe8cf5a4342401ca3f89c8e06e to codex/public-auth-redesign. Instagram and test-results remain ignored. Do not stage generated next-env.d.ts changes.
8. Prefer final backend rollout before frontend main promotion, then verify both deployment states/commit hashes. No live fixture writes or reseeding customer data.

## Deployment checkpoint
- Render dep-datr0gnf3r2c73e2n3h0: LIVE on 3f1f9ce at 2026-09-29 12:36:47 UTC. Startup runs migrate deploy before seed/start, so the new schema migration completed. Live OpenAPI confirms /finance/report and /finance/expenses routes.
- Vercel production dpl_C5dgWYij2M1h1CD91Tc7XWndhs3M READY on 3f1f9ce, canonical alias https://progym-homs.vercel.app verified. Both GitHub branches point to the implementation commit at verification.
- Production health endpoint responds with six security questions; no customer records edited by testing.
- Live Arabic/English contact pages HTTP 200. Unauthenticated financial report endpoint returns 401, as intended.
- Final live smoke checks: /ar, /en, both contact locales, /ar/register and branch plans/expenses/reports routes all returned HTTP 200 with no Internal Server Error. Protected dashboard data was exercised locally; live business records were not changed for testing.
- Root AGENTS.md now points future work to this checkpoint and records the user's continuity/preservation instructions.
- A documentation-only follow-up commit records this completed checkpoint. Its application code is identical to verified 3f1f9ce; automatic deploys of that documentation commit may follow.
- Optional extra subscriber-PDF automated download check hit browser automation connection timeout; financial PDF was already generated and both pages visually verified. Do not confuse the automation timeout with an application error.
