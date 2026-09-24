import { Worker, Job } from "bullmq";
import { getRedis } from "../config/redis";
import { env } from "../config/env";
import { EmailRepository } from "../repositories/email.repository";
import { MailProvider } from "../mail/mail-provider";
import { checkAndIncrement, msUntilNextHour } from "../rateLimiter/hourly-limiter";

export function createEmailWorker(repository: EmailRepository, mailProvider: MailProvider) {
  const worker = new Worker(
    "email-send",
    async (job: Job<{ emailId: string }>) => {
      const { emailId } = job.data;
      const email = await repository.findById(emailId);
      if (!email) return;
      if (email.status === "sent") return;

      const { allowed } = await checkAndIncrement(email.sender);
      if (!allowed) {
        await job.moveToDelayed(Date.now() + msUntilNextHour());
        return;
      }

      try {
        await mailProvider.send(email);
        await repository.updateStatus(emailId, "sent");
      } catch {
        await repository.updateStatus(emailId, "failed");
        throw new Error("send failed");
      }
    },
    { connection: getRedis(), concurrency: env.workerConcurrency, limiter: { max: 1, duration: env.delayMs } }
  );
  return worker;
}
