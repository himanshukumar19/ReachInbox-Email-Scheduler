# Per-Sender Hourly Rate Limit Scope (ADR 0002)

Rate limit is per-Sender (`rate:<Sender>:<hour>`), not per-request. Key is `INCR` with `EXPIRE 3600`; value is global env `MAX_EMAILS_PER_HOUR` (default 50). On breach the job is rescheduled via `moveToDelayed` to the next hour window and never dropped. No per-request `hourlyLimit` field exists; `rateLimiter/` has zero Express/BullMQ imports.
