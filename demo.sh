#!/bin/bash
# Demo script — locked, not optional (issue 07)
# Proves Q1/04 (restart persistence + no duplicates), Q3/02 (limiter + concurrency decoupling), Q4/01 (bulk idempotency)
# Run ONLY after backend is running (`npm run dev`) and frontend (`npm run dev`) with docker-compose up.
# Do not edit sequence — it is part of submission evidence.

set -euo pipefail

echo "=== DEMO: Restart persistence (Q1/04) ==="
echo "1. Schedule 2-3 emails 2-3 min out via Compose or curl POST /api/emails/schedule"
echo "2. Note the email IDs shown (client UUIDs = jobIds)."
echo "3. Kill backend process (Ctrl-C / kill <pid>)."
echo "4. Restart: npm run dev (backend)"
echo "5. Confirm on-time sends with zero duplicates — check DB status and BullMQ job removal."

echo ""
echo "=== DEMO: Rate limit under load (Q3 limiter + Q4 bulk) ==="
echo "Send 5+ quickly with concurrency=5; observe paced sends via BullMQ limiter (not 5 at once)."
echo "Exceed hourly cap for sender -> job.moveToDelayed to next hour; verify DB row stays scheduled no drop."

echo ""
echo "=== DEMO: Dashboard tabs ==="
echo "Open http://localhost:3000 -> Scheduled tab shows future sends; Sent tab shows both sent and failed (ContEXT.md: Sent Emails)."
