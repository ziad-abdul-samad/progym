# Continuity and safe deployment

- The user explicitly wants interrupted work to resume from its last checkpoint. Before continuing a task, read `docs/branch-accounting-work.md` and inspect `git status` / relevant diffs. Treat recorded deployment states as checkpoints, then verify current remote state rather than assuming they are still current.
- Keep that worklog updated after meaningful implementation, verification and deployment milestones. Record completed work, outstanding work, test results, commit/deployment IDs and blockers. Never store tokens, connection strings or production passwords in it.
- Preserve existing live users, subscriptions and payments. Test financial mutations only against isolated local fixtures; never reset/reseed customer data or infer missing historical prices.
- Do not upload the Instagram content/image folder or ignored local test artifacts.
- An automatic future restart is not guaranteed. Save resumable state before handing back control; when the user says “continue”, resume pending steps instead of restarting finished implementation.
