# Branch accounting rollout — 2026-09-29

## Current task — delete offers and actual JolyUI maps (Sept30)
- Requested: delete specific plan with confirmation, preserve all historical subscriptions/receipts; supplied B2/B3 Google Maps links; use actual official JolyUI Expanded Map, not previous approximation.
- WIP uncommitted: MembershipPlan.deletedAt additive migration, branch-scoped audited idempotent soft-delete endpoint and confirmation UI; list/update/purchase reject deleted offers.
- Official MIT JolyUI registry source fetched from https://jolyui.dev/r/expanded-map and installed in expanded-map.tsx; local accessibility/mobile/RTL/exact-pin adaptations pending. THIRD_PARTY_NOTICES.md holds upstream MIT license.
- B2 supplied link verified in Google Maps: Pro GYM, 34.7393643,36.7113847 (ftid 0x15230f0055f09fad:0xb8fd19f9f7de18de). B3 supplied link verified: professional gym, 34.7048545,36.7113036 (ftid 0x15230f354f18f935:0x44a21776dd26f180). Branch content now holds exact coordinates and user links; contact maps and footer links share this source.
- JolyUI official source installed and adapted: original compact 240x140 to 360x280 card, spring tilt/reveal, coordinates/underline; public palette, AR/EN, keyboard/Escape, max-width mobile, unique SVG IDs, tile attribution, lazy tile preload, corrected fractional tile positioning.
- Backend build and 29 PostgreSQL integration checks passed on fresh localhost:55434/plan_delete_checks, including deleting a paid offer while preserving subscription/receipt/report and concurrent deletion audit. Test owner test.admin.b1.0ae638bc, B2 observer test.observer.b2.0ae638bc; disposable password from test script.
- Verification: backend build/lint and 26 unit tests passed; frontend production build (171 routes), typecheck/lint passed; all 29 isolated PostgreSQL checks passed. Remote working branch/main and Render LIVE reverified at 440fb3b before rollout.
- Visual verification caught the official default CARTO tiles returning API-key warning images despite HTTP success. Switched the component's supported default to OpenStreetMap (no API key), preserving actual JolyUI interaction; attribution and direct Google directions remain visible. Only expanded maps load tiles using normal browser cache/referrer.
- Visual checks passed: actual OSM streets/landmarks loaded (no API warning), mobile 390px and desktop 1440px have no horizontal overflow. Screenshots ignored under test-results/joly-osm-*.png. Branch coordinates and Google directions verified. Final lint/diff check passed.
- Remaining: backend-first rollout, then main/Vercel promotion and read-only production checks. No live customer records mutated for testing.

## Follow-up in progress — acceptance UX / clearer PDFs / Inshaat offers
- User requested acceptance dialog immediate close with success notice; found onSuccess calls manual close while mutation is pending, so guard prevents close. Fixed automatic completion separately and made cache refresh non-blocking; requests-page success toast also added.
- PDF redesign: first-page currency-separated cash-flow cards, vector icons, plain-language guide, numbered descriptive sections; keep all existing details and historical prices.
- New B1 offers: monthly USD30 or newSYP4000, half-month USD15 or newSYP2000, daily newSYP450; women's monthly2250 / half1500 / daily350 newSYP.
- Added one-time migration for catalog additions/daily-price update and two women's observer accounts (7 AM–3 PM, 3 PM–10 PM). Existing three observers and historical receipts untouched. Random initial credentials stored ONLY in ignored test-results/inshaat-girls-accounts.txt, never in this log; database migration contains Argon2 hashes only.
- Assumptions: women's plans are explicitly selected by reception; both new observers share existing B1 observer permissions. No separate gender-isolation requirement was given. Month30 days / half15 days.
- Local migration checks passed: every pre-existing User/ShiftObserver/Subscription/Payment unchanged; all 8 specified B1 catalog entries correct; two new observer shifts/roles correct; repeated migrate deploy preserves accounts. Extra custom offers retained.
- Frontend build (171 routes), frontend typecheck/lint, backend lint and 30 unit tests passed. Acceptance dialog exercised with a disposable local registration: closed after successful approval (zero open dialogs).
- Generated revised financial PDF (481146 bytes) and visually inspected all 3 pages with Poppler. Summary, icons, Arabic guide, original plan prices, observers and expense/void details are legible; no clipping. Artifacts ignored under test-results/followup-financial.pdf and followup-pdf-*.png.
- All 24 accounting integration checks passed on fresh localhost:55434/accounting_followup with all 26 migrations, including new offers/accounts.
- COMPLETED: implementation committed/pushed to BOTH working branch and main as 440fb3bae65a2a6ef1f39f0fcdbec627c308db48. Render dep-dau0iqrbc2fs73c2sd3g LIVE at 18:57:20 UTC. Vercel production dpl_GZcjkmGpnmLWMswPDNWQHRJxidhT READY with canonical alias progym-homs.vercel.app. Credentials file remains local/ignored.
- Production logs confirmed new Inshaat migration successfully applied at 2026-09-29 18:56:39 UTC; no lock error on this deploy. Checking new accounts via login + read-only catalog/observer endpoints, no test registrations/payments on production.
- Also generated and visually inspected the revised subscriber PDF; player names, plan, amount, payment date/time and receipt ID are clear. Browser console has no errors.
- Production verification passed for BOTH new observer logins, exact eight Inshaat prices, own-shift times and observer-directory scoping. Logged the test sessions out. No production registration/payment/expense test records created.
- No pending implementation in this follow-up. Latest local worklog edits document verified deployment states; application code is committed and deployed. Preserve this checkpoint if a future task starts after a token reset.
- Remote checkpoint reverified: Vercel docs commit 51ad949 READY, but matching Render docs-only redeploy failed acquiring Prisma advisory lock (P1002) on Sept29 12:41 UTC. Prior application commit remained live. Check new deploy carefully; do not disable migration locking.

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
