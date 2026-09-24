# 05 — Defensive Recipient import + Batch Stagger surfaced

**What to build:** CSV upload via PapaParse skips rows failing proper email-format validation, dedups case-insensitively, toasts deduped valid count, blocks Schedule when zero, and exposes `delayBetweenMs` from Compose.

**Blocked by:** 01 — Bulk enqueue for 1000 Recipients (batch size makes the guard meaningful)

**Status:** ready-for-agent

- [ ] `ComposeModal.tsx` validates each cell with proper email regex (not bare `/@/`), normalizes to lower-case, dedups via `Set`, toasts deduped count
- [ ] Shows `{n} addresses detected` + red "Add at least one valid Recipient" when 0; Schedule button disabled when `recipients.length === 0`
- [ ] Numeric "Delay between emails (ms)" input default 1000, wired to `scheduleEmails({ ..., delayBetweenMs })` and backend `delayBetweenMs?`
- [ ] Already live after grill pass — this ticket locks it with component tests and verifies `CONTEXT.md: Recipient` + `CONTEXT.md: Batch Stagger` (user-configurable) remain; gated by `Definition of Done`
