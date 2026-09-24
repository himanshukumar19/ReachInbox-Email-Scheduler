# ReachInbox Email Scheduler

Email scheduling and sending with durable delayed jobs.

## Language

**Recipient**:
The email address a Scheduled Email is sent to; matches the API field `recipients`. Invalid rows on CSV import are skipped via proper email-format validation (not bare `/@/`), valid addresses are deduped case-insensitively, and the UI shows the deduped valid count; if count is 0, Schedule is blocked client-side.
_Avoid_: Lead, emails, address

**Authenticated User**:
The Google-authenticated identity whose profile (name, email, avatar) populates the header after OAuth.
_Avoid_: account, sender

**Sent Emails**:
Rows where `status ∈ {sent, failed}` as returned by `GET /sent`; the dashboard tab labeled `Sent` shows both outcomes to match Figma. Displayed "sent time" for a failed row is `updatedAt` (time of the failed attempt, not an actual send).
_Avoid_: sent only, completed emails

**Batch Stagger**:
User-configurable at Compose time via `delayBetweenMs` on the schedule request; `sendAt = base + i * delayBetweenMs` spreads scheduled send times across a large batch at enqueue time.
_Avoid_: throttle, rate limit

**Definition of Done**:
Every ticket's diff is gated on SOLID (§5), exactly three patterns Repository/Strategy/Singleton + DI (§6), the four layering rules `api∕→queue∕mail`, `queue∕→Express`, `rateLimiter∕→Express∕BullMQ`, `repositories`-only Prisma (§7), and no-comments/no-console.log/no-any/naming (§9). Any new pattern, library, or boundary exception requires an ADR first — never ad-hoc in a ticket.
_Avoid_: aspirational guidelines
