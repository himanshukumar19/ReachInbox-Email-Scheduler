# 02 — Send Throttle via BullMQ limiter (decoupled from concurrency)

**What to build:** A minimum gap between individual sends holds even with `WORKER_CONCURRENCY=5`; the Worker's per-job `setTimeout` sleep is replaced by a BullMQ worker-level limiter.

**Blocked by:** None — can start immediately (parallel with 01; 01's Batch Stagger helps demo it)

**Status:** ready-for-agent

- [ ] Remove `if (env.delayMs > 0) await setTimeout` from inside the job handler in `queue/worker.ts`
- [ ] Add `limiter: { max: 1, duration: env.delayMs }` to `Worker` options alongside `concurrency: env.workerConcurrency`
- [ ] `WORKER_CONCURRENCY` still governs mid-flight I/O parallelism, not pacing; `Send Throttle` via limiter enforces true gap across concurrent slots
- [ ] Demoable: schedule 5 for `now` with concurrency 5, observe paced sends (not 5 at once as with per-job sleep)
