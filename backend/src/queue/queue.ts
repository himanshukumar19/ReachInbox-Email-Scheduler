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
  return getEmailQueue().add("send-email", { emailId }, { delay, jobId: emailId, removeOnComplete: true, removeOnFail: 100 });
}
