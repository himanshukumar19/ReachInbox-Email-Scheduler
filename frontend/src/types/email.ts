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
  userId?: string | null;
};

export type SchedulePayload = {
  recipients: string[];
  subject: string;
  body: string;
  sender: string;
  scheduledAt: string;
  delayBetweenMs?: number;
};

export type ScheduleResponse = {
  ids: string[];
  count: number;
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  avatar: string;
};
