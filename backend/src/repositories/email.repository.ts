export type EmailStatus = "scheduled" | "sent" | "failed";

export type EmailRecord = {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  scheduledAt: Date;
  status: EmailStatus;
  createdAt: Date;
  updatedAt: Date;
  userId?: string | null;
};

export interface EmailRepository {
  create(data: Omit<EmailRecord, "id" | "createdAt" | "updatedAt" | "status"> & { status?: EmailStatus }): Promise<EmailRecord>;
  findById(id: string): Promise<EmailRecord | null>;
  findScheduled(limit?: number, offset?: number): Promise<EmailRecord[]>;
  findSent(limit?: number, offset?: number): Promise<EmailRecord[]>;
  updateStatus(id: string, status: EmailStatus): Promise<EmailRecord>;
}
