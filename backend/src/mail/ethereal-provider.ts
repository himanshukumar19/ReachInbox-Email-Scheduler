import nodemailer from "nodemailer";
import { MailProvider, SendResult } from "./mail-provider";
import { EmailRecord } from "../repositories/email.repository";
import { env } from "../config/env";

export class EtherealProvider implements MailProvider {
  private transporter = nodemailer.createTransport({
    host: env.etherealHost,
    port: env.etherealPort,
    auth: { user: env.etherealUser, pass: env.etherealPass },
  });

  async send(email: EmailRecord): Promise<SendResult> {
    const info = await this.transporter.sendMail({
      from: email.sender,
      to: email.recipient,
      subject: email.subject,
      html: email.body,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      process.stdout.write(`Ethereal preview: ${previewUrl}\n`);
    }
    return { messageId: info.messageId, previewUrl };
  }
}
