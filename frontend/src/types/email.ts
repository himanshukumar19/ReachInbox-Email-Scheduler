export type EmailStatus = "scheduled" | "sent" | "failed";
export type Email = {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  scheduledAt: string;
  status: EmailStatus;
  createdAt: string;
  updatedAt: string;
};
export type SchedulePayload = {
  recipients: string[];
  subject: string;
  body: string;
  sender: string;
  scheduledAt: string;
  delayBetweenMs?: number;
};
