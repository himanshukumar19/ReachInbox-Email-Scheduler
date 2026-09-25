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

export type EmailCreateData = Omit<EmailRecord, "id" | "createdAt" | "updatedAt" | "status"> & {
  status?: EmailStatus;
};

export type EmailBulkCreateData = Omit<EmailRecord, "createdAt" | "updatedAt" | "status"> & {
  status?: EmailStatus;
};

export interface EmailRepository {
  create(data: EmailCreateData): Promise<EmailRecord>;
  createMany(rows: EmailBulkCreateData[]): Promise<void>;
  findById(id: string): Promise<EmailRecord | null>;
  findScheduled(limit?: number, offset?: number): Promise<EmailRecord[]>;
  findSent(limit?: number, offset?: number): Promise<EmailRecord[]>;
  updateStatus(id: string, status: EmailStatus): Promise<EmailRecord>;
}
