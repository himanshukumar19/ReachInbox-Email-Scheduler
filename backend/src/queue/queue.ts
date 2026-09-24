import { Queue } from "bullmq";
import { getRedis } from "../config/redis";

export const EMAIL_QUEUE = "email-send";

let queue: Queue | null = null;

export function getEmailQueue(): Queue {
  if (!queue) {
    queue = new Queue(EMAIL_QUEUE, { connection: getRedis() });
  }
  return queue;
}

export async function enqueueEmail(emailId: string, sendAt: Date) {
  const delay = Math.max(0, sendAt.getTime() - Date.now());
  return getEmailQueue().add("send-email", { emailId }, { delay, jobId: emailId, removeOnComplete: true, removeOnFail: 100, attempts: 3, backoff: { type: "exponential", delay: 5000 } });
}

export async function enqueueMany(items: Array<{ emailId: string; sendAt: Date }>) {
  const jobs = items.map(({ emailId, sendAt }) => ({
    name: "send-email",
    data: { emailId },
    opts: { delay: Math.max(0, sendAt.getTime() - Date.now()), jobId: emailId, removeOnComplete: true, removeOnFail: 100, attempts: 3, backoff: { type: "exponential", delay: 5000 } },
  }));
  return getEmailQueue().addBulk(jobs);
}
