import nodemailer from "nodemailer";
import { EmailRecord } from "../repositories/email.repository";

export interface MailProvider {
  send(email: EmailRecord): Promise<nodemailer.SentMessageInfo>;
}
