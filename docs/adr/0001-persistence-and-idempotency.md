# Persistence and Idempotency (ADR 0001)

BullMQ Redis persistence is the sole restart recovery mechanism. The DB (`Postgres`) is the durable source of truth for send outcomes, but it is never queried on boot to re-enqueue jobs.

## Decisions

- **Enqueue uses `jobId = EmailId` (client UUID from `crypto.randomUUID()`)**: BullMQ deduplicates by `jobId`; duplicate enqueues of the same `EmailId` are ignored instead of creating double jobs.
- **Worker idempotency guard**: Before sending, `repository.findById(emailId)` is called. If `status === "sent"`, the job returns immediately without calling the mail provider. This prevents double-send if a job is re-run after a crash that occurred after DB update but before job removal, or if BullMQ redelivers a completed job.
- **No boot-time re-seed**: `index.ts` calls `createEmailWorker()` only; there is no `findScheduled()` loop or `addBulk` on startup. Relying on BullMQ's own Redis persistence avoids the most common duplicate-enqueue bug.
- **Rate-limit reschedule, not drop**: If the hourly cap is hit, `job.moveToDelayed()` pushes the job to the next hour window rather than failing or losing it.

## Known limitation (disclosed, not reconciled)

If Redis is fully wiped (not just restarted with persistence disabled), all delayed `email-send` jobs are lost. The DB rows with `status = scheduled` become stranded — they will never send and are not automatically reconciled. This is an accepted trade-off for this build; reconciliation (scanning DB and re-enqueueing with a guard) is out of scope because any naive re-seed risks duplicates if the job actually survived in Redis.
