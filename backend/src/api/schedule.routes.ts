import { Router } from "express";
import { scheduleSchema } from "./schedule.schema";
import { EmailRepository } from "../repositories/email.repository";
import { enqueueEmail } from "../queue/queue";

export function scheduleRouter(repository: EmailRepository): Router {
  const r = Router();

  r.post("/schedule", async (req, res) => {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { recipients, subject, body, sender, scheduledAt } = parsed.data;
    const baseTime = new Date(scheduledAt);
    const delayBetween = parsed.data.delayBetweenMs ?? 1000;

    const created: string[] = [];
    for (let i = 0; i < recipients.length; i++) {
      const sendAt = new Date(baseTime.getTime() + i * delayBetween);
      const row = await repository.create({ recipient: recipients[i], subject, body, sender, scheduledAt: sendAt });
      await enqueueEmail(row.id, sendAt);
      created.push(row.id);
    }
    res.status(201).json({ ids: created, count: created.length });
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
