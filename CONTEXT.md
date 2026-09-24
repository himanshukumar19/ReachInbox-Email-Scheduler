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

**Scheduled Email**:
A row in the `Email` table with `status = scheduled`; it represents a future send that has been enqueued but not yet attempted. BullMQ Redis persistence holds the corresponding delayed job (`jobId = EmailId`). The DB and queue must stay aligned, but on restart only BullMQ recovers the job — never re-seed from DB.
_Avoid_: pending email, queued message, unprocessed lead

**Sent Email**:
A row with `status = sent`; a successfully delivered email whose `updatedAt` reflects the actual send time.
_Avoid_: delivered only, completed message

**Failed Email**:
A row with `status = failed`; the send was attempted (DB status updated by the worker) but did not complete. Its displayed time is `updatedAt` (time of the failed attempt). It is included in `GET /sent` and the `Sent` dashboard tab.
_Avoid_: error email, broken email

**Batch Stagger**:
User-configurable at Compose time via `delayBetweenMs` on the schedule request; `sendAt = base + i * delayBetweenMs` spreads scheduled send times across a large batch at enqueue time.
_Avoid_: throttle, rate limit

**Definition of Done**:
Every ticket's diff is gated on SOLID (§5), exactly three patterns Repository/Strategy/Singleton + DI (§6), the four layering rules `api∕→queue∕mail`, `queue∕→Express`, `rateLimiter∕→Express∕BullMQ`, `repositories`-only Prisma (§7), and no-comments/no-console.log/no-any/naming (§9). Any new pattern, library, or boundary exception requires an ADR first — never ad-hoc in a ticket.
_Avoid_: aspirational guidelines
