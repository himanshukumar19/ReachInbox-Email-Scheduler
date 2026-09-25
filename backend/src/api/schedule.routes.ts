import { randomUUID } from "crypto";
import { Router, Request, Response } from "express";
import { scheduleSchema } from "./schedule.schema";
import { EmailRepository } from "../repositories/email.repository";
import { enqueueMany } from "../queue/queue";

export function scheduleRouter(repository: EmailRepository): Router {
  const r = Router();

  r.post("/schedule", async (req: Request, res: Response) => {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { recipients, subject, body, sender, scheduledAt, delayBetweenMs, hourlyLimit } = parsed.data;
    const baseTime = new Date(scheduledAt);
    const delayBetween = delayBetweenMs ?? 1000;

    try {
      const rows = recipients.map((recipient, i) => ({
        id: randomUUID(),
        recipient,
        subject,
        body,
        sender,
        scheduledAt: new Date(baseTime.getTime() + i * delayBetween),
      }));
      await repository.createMany(rows);
      await enqueueMany(rows.map((row) => ({ emailId: row.id, sendAt: row.scheduledAt, hourlyLimit })));
      res.status(201).json({ ids: rows.map((row) => row.id), count: rows.length });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
    }
  });

  r.get("/scheduled", async (req: Request, res: Response) => {
    const limit = parseInt((req.query.limit as string) ?? "50", 10);
    const offset = parseInt((req.query.offset as string) ?? "0", 10);
    try {
      const rows = await repository.findScheduled(limit, offset);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
    }
  });

  r.get("/sent", async (req: Request, res: Response) => {
    const limit = parseInt((req.query.limit as string) ?? "50", 10);
    const offset = parseInt((req.query.offset as string) ?? "0", 10);
    try {
      const rows = await repository.findSent(limit, offset);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
    }
  });

  return r;
}
