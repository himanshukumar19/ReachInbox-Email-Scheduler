import { EmailRecord } from "../repositories/email.repository";

export type SendResult = {
  messageId: string;
  previewUrl?: string;
};

export interface MailProvider {
  send(email: EmailRecord): Promise<SendResult>;
}
