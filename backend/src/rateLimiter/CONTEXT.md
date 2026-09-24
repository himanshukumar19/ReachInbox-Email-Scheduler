# rateLimiter/ — Sender Context

- Sender: email address string from `email.sender`; rate key `rate:<Sender>:<hour>` (ISO hour `YYYY-MM-DDTHH`).
- Scope: per-Sender independent counters via global env `MAX_EMAILS_PER_HOUR`; zero Express/BullMQ imports.
