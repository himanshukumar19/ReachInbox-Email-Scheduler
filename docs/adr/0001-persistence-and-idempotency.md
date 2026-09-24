# Persistence and Idempotency via BullMQ Redis

Postgres is the durable source of truth but BullMQ's Redis persistence is the sole recovery mechanism after restart; each email is enqueued with `jobId = emailId` as the dedup key, and the worker's DB status check (`status === "sent" => return`) is the idempotency guard for a job that re-runs after a crash mid-send. No code path may query `status=scheduled` on boot to re-enqueue, because that second path is the single most common source of duplicate sends.

**Known limitation:** if Redis data is lost entirely (not just a restart, a wipe), DB rows stuck at `status=scheduled` have no job behind them and won't send — intentionally undefended for this assignment and disclosed as a trade-off; no reconciliation logic is implemented.
