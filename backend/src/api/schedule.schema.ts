import { z } from "zod";

export const scheduleSchema = z.object({
  recipients: z.array(z.string().email()).min(1),
  subject: z.string().min(1).max(300),
  body: z.string().min(1),
  sender: z.string().email(),
  scheduledAt: z.string().datetime(),
  delayBetweenMs: z.number().int().min(0).optional(),
});

export type ScheduleInput = z.infer<typeof scheduleSchema>;
