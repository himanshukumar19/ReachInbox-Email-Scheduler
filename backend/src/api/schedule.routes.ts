import { randomUUID } from "crypto";
import { Router } from "express";
import { scheduleSchema } from "./schedule.schema";
import { EmailRepository } from "../repositories/email.repository";
import { enqueueMany } from "../queue/queue";

export function scheduleRouter(repository: EmailRepository): Router {
  const r = Router();

  r.post("/schedule", async (req, res) => {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { recipients, subject, body, sender, scheduledAt } = parsed.data;
    const baseTime = new Date(scheduledAt);
    const delayBetween = parsed.data.delayBetweenMs ?? 1000;

    const rows = recipients.map((recipient, i) => ({
      id: randomUUID(),
      recipient,
      subject,
      body,
      sender,
      scheduledAt: new Date(baseTime.getTime() + i * delayBetween),
    }));
    await repository.createMany(rows);
    await enqueueMany(rows.map((r) => ({ emailId: r.id, sendAt: r.scheduledAt })));
    res.status(201).json({ ids: rows.map((r) => r.id), count: rows.length });
  });

  r.get("/scheduled", async (req, res) => {
    const limit = parseInt((req.query.limit as string) ?? "50", 10);
    const offset = parseInt((req.query.offset as string) ?? "0", 10);
    const rows = await repository.findScheduled(limit, offset);
    res.json(rows);
  });

  r.get("/sent", async (req, res) => {
    const limit = parseInt((req.query.limit as string) ?? "50", 10);
    const offset = parseInt((req.query.offset as string) ?? "0", 10);
    const rows = await repository.findSent(limit, offset);
    res.json(rows);
  });

  return r;
}
