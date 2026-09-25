import { Worker, Job } from "bullmq";
import { getRedis } from "../config/redis";
import { env } from "../config/env";
import { EmailRepository } from "../repositories/email.repository";
import { MailProvider } from "../mail/mail-provider";
import { checkAndIncrement, msUntilNextHour } from "../rateLimiter/hourly-limiter";
import { EmailJobData } from "./queue";

export function createEmailWorker(repository: EmailRepository, mailProvider: MailProvider) {
  const worker = new Worker(
    "email-send",
    async (job: Job<EmailJobData>) => {
      const { emailId, hourlyLimit } = job.data;
      const email = await repository.findById(emailId);
      if (!email) return;
      if (email.status === "sent") return;

      const { allowed } = await checkAndIncrement(email.sender, hourlyLimit);
      if (!allowed) {
        await job.moveToDelayed(Date.now() + msUntilNextHour());
        return;
      }

      try {
        await mailProvider.send(email);
        await repository.updateStatus(emailId, "sent");
      } catch (err) {
        const maxAttempts = job.opts.attempts ?? 1;
        if (job.attemptsMade >= maxAttempts) {
          await repository.updateStatus(emailId, "failed");
        }
        throw new Error("send failed: " + (err instanceof Error ? err.message : String(err)));
      }
    },
    { connection: getRedis(), concurrency: env.workerConcurrency, limiter: { max: 1, duration: env.delayMs } }
  );
  worker.on('error', (err) => console.error('WORKER ERROR', err));
  worker.on('failed', (job, err) => console.error('JOB FAILED', job?.id, err));
  worker.on('active', (job) => console.log('JOB ACTIVE', job?.id));
  worker.on('completed', (job) => console.log('JOB COMPLETED', job?.id));
  return worker;
}
