import { Queue } from "bullmq";
import { getRedis } from "../config/redis";

export const EMAIL_QUEUE = "email-send";

export type EmailJobData = {
  emailId: string;
  hourlyLimit?: number;
};

let queue: Queue | null = null;

export function getEmailQueue(): Queue {
  if (!queue) {
    queue = new Queue(EMAIL_QUEUE, { connection: getRedis() });
  }
  return queue;
}

export async function enqueueEmail(emailId: string, sendAt: Date, hourlyLimit?: number) {
  const delay = Math.max(0, sendAt.getTime() - Date.now());
  const data: EmailJobData = { emailId, ...(hourlyLimit !== undefined && { hourlyLimit }) };
  return getEmailQueue().add("send-email", data, {
    delay,
    jobId: emailId,
    removeOnComplete: true,
    removeOnFail: 100,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function enqueueMany(items: Array<{ emailId: string; sendAt: Date; hourlyLimit?: number }>) {
  const jobs = items.map(({ emailId, sendAt, hourlyLimit }) => {
    const data: EmailJobData = { emailId, ...(hourlyLimit !== undefined && { hourlyLimit }) };
    return {
      name: "send-email",
      data,
      opts: {
        delay: Math.max(0, sendAt.getTime() - Date.now()),
        jobId: emailId,
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    };
  });
  return getEmailQueue().addBulk(jobs);
}
