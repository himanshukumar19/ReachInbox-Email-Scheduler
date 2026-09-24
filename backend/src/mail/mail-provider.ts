import { EmailRecord } from "../repositories/email.repository";

export interface MailProvider {
  send(email: EmailRecord): Promise<{ messageId: string; previewUrl?: string }>;
}
