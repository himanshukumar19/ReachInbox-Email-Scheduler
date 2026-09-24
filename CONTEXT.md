# ReachInbox Email Scheduler

Email scheduling and sending with durable delayed jobs.

## Language

**Scheduled Email**:
A DB row with `status=scheduled` that has a BullMQ delayed job owned by Redis, enqueued with `jobId = emailId`.
_Avoid_: pending email, queued email

**Sent Email**:
A DB row with `status=sent`, set only after `mailProvider.send()` succeeds.
_Avoid_: delivered email, completed email

**Failed Email**:
A DB row with `status=failed`, set only after a throw during `mailProvider.send()`.
_Avoid_: errored email, bounced email

**Sender**:
The `sender` email string on the schedule request; each sender owns its own Redis counter key `rate:<sender>:<hour>` incremented via `INCR`/`EXPIRE 3600`. The hourly limit is a single global env value `MAX_EMAILS_PER_HOUR` applied per-sender-key, not configurable per request in this build.
_Avoid_: user, account, from-address

**Batch Stagger**:
Spreading scheduled send times across a large batch at enqueue time via `sendAt = base + i * delayBetweenMs` in `schedule.routes.ts`.
_Avoid_: throttle, rate limit

**Send Throttle**:
BullMQ worker limiter enforcing a true minimum gap between actual sends regardless of concurrency, via `limiter: { max: 1, duration: env.delayMs }` on the worker.
_Avoid_: delay, stagger, sleep
