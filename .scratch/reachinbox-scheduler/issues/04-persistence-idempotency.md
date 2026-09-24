# 04 — Persistence & idempotency (sole recovery, no re-seed)

**What to build:** BullMQ Redis persistence is the sole restart recovery; no boot-time re-seed from `status=scheduled`. Enqueue uses `jobId = EmailId`, Worker checks DB `status === "sent"` before send as the idempotency guard.

**Blocked by:** 01 — Bulk enqueue for 1000 Recipients (needs bulk's EmailId/jobId to verify)

**Status:** ready-for-agent

- [ ] `queue/queue.ts` enqueues with `jobId: EmailId` (UUID from bulk); `queue/worker.ts` does `findById` + `if (status === "sent") return` before `mailProvider.send`
- [ ] No code path queries `status=scheduled` on boot to re-enqueue; `index.ts` only calls `createEmailWorker`, relying on BullMQ Redis persistence
- [ ] Adds `CONTEXT.md: Scheduled Email / Sent Email / Failed Email` + `docs/adr/0001-persistence-and-idempotency.md` with Known limitation: Redis wipe → stranded `scheduled` rows (disclosed, not reconciled)
- [ ] Demoable: schedule 2-3 emails minutes out → kill backend → restart → on-time sends, no duplicates
