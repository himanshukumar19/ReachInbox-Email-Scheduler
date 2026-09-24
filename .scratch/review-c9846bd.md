# Code Review — c9846bd vs 010b022 (bulk enqueue)

Axis: Spec (issue 01 / brief §8,13 / SPEC.md Implementation Decisions)

---

## (a) Requirements missing / partial (quote spec line)

- **Layering violation unsolved.** Brief §7 line 154: "`api/` never imports from `queue/` or `mail/` directly." Diff `schedule.routes.ts:5` keeps `import { enqueueMany } from "../queue/queue"`; it just swaps `enqueueEmail` → `enqueueMany`. Pre-existing, not fixed by this commit.
- **No DB re-seed on boot verified** — `index.ts` has no enqueue loop; worker guard at `worker.ts:15` (`if (email.status === "sent") return;`) satisfies idempotency. SPEC.md line 51: "Enqueue uses `jobId = EmailId`; the Worker checks `repository.findById`" — present.

---

## (b) Scope creep — behaviour not asked for

None. Changes are exactly: `randomUUID()` PK generation, `createMany` interface+impl, `enqueueMany` via `addBulk`, bulk await before 201. No extra fields, no new routes, no error-handling changes.

---

## (c) Implemented but wrong — quote spec + diff line

- **None in Spec axis.** All bulk mechanics match spec.
- **Batch Stagger preserved correctly:** `schedule.routes.ts:21` `scheduledAt: new Date(baseTime.getTime() + i * delayBetween)`; `queue.ts:24` `delay: Math.max(0, sendAt.getTime() - Date.now())`; `enqueueMany` passes `sendAt = r.scheduledAt`. SPEC.md line 52: "`Batch Stagger` math is preserved per job in the bulk arrays." Correct.
- **Client UUID used as both PK and jobId:** `schedule.routes.ts:16` `id: randomUUID()`; `queue.ts:24` `jobId: emailId`; same `r.id` feeds both `createMany` and `enqueueMany`. Issue 01 line 3 / SPEC.md line 52 — satisfied.
- **Bulk calls awaited before 201:** `schedule.routes.ts:25-26` `await repository.createMany(rows); await enqueueMany(...)` then `res.status(201)`. SPEC.md line 52: "handler still awaits both bulk calls before 201"; brief §13 line 262: "must enqueue without blocking" — satisfied (bulk only, no per-item await).
- **No `any` / typed:** `repositories/email.repository.ts:16-17` new `EmailCreateData` / `EmailBulkCreateData` types; `prisma-email.repository.ts` uses them. Brief §9 line 192 / SPEC.md line 56 — satisfied.
- **Interfaces before impl:** interface updated at `email.repository.ts:16` before `prisma-email.repository.ts:12`. Brief §5 / SPEC.md line 59 — satisfied.
- **Rate limiter / repo isolation unchanged, verified:** `rateLimiter/hourly-limiter.ts` not in diff but `worker.ts:6` imports only from it; `repositories/prisma-email.repository.ts` imports only `email.repository` + `db/prisma-client`. Brief §7 lines 156-157 — satisfied.

---

## Total findings (Spec axis only — do not cross-rank with Standards)

- 1 partial (layering import — pre-existing). 0 wrong. 0 creep.
- 6 verified correct (UUID/PK/jobId, createMany+addBulk await, Batch Stagger, no per-item block, idempotency/no-reseed, types/interfaces/isolated layers).

**Worst within Spec axis:** layering import (`api/` → `queue/`) remains; everything else fully implements issue 01.
