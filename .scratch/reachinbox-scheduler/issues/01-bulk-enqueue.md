# 01 — Bulk enqueue for 1000 Recipients

**What to build:** An Authenticated User can schedule 1000 Recipients in one Compose submit and get a 201 quickly; the API uses client-generated EmailId (`crypto.randomUUID()`) as both Prisma PK and BullMQ `jobId`, via `repository.createMany` (`prisma.email.createMany`) and `emailQueue.addBulk` with per-job `delay` + `jobId` + `Batch Stagger` (`sendAt = base + i * delayBetweenMs`).

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `POST /api/emails/schedule` with 1000 recipients returns 201 with 1000 ids without per-recipient blocking (two bulk calls awaited before response)
- [ ] `EmailId` is generated client-side via `crypto.randomUUID()` and used as both DB PK and BullMQ `jobId` (idempotency key) in a single bulk pass
- [ ] `repository.createMany` and `emailQueue.addBulk` preserve `Batch Stagger` per job and `jobId` dedup; no `any`, no comments, `repositories/` is the only Prisma importer
- [ ] Demoable: schedule 1000 via API or Compose, verify 201 + enqueued jobs spread by `delayBetweenMs`
