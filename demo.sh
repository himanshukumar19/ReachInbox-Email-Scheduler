#!/bin/bash
# Locked demo script — do not edit sequence
# 1. Schedule 2-3 emails 2-3 minutes out
# 2. Note returned email IDs (crypto.randomUUID = DB PK = BullMQ jobId)
# 3. Kill backend (kill <pid> or Ctrl-C)
# 4. Restart (npm run dev in backend/)
# 5. Confirm on-time sends with zero duplicates — DB scheduled -> sent, BullMQ job removed
# 6. Rate-limit-under-load clip: send 5+ quickly with concurrency 5; observe paced sends via BullMQ limiter
# 7. Open dashboard tabs (http://localhost:3000) for Scheduled / Sent states
