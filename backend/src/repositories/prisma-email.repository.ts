import { EmailRepository, EmailRecord, EmailCreateData, EmailBulkCreateData } from "./email.repository";
import { getPrisma } from "../db/prisma-client";

export class PrismaEmailRepository implements EmailRepository {
  private prisma = getPrisma();

  async create(data: EmailCreateData): Promise<EmailRecord> {
    const row = await this.prisma.email.create({ data: { ...data, status: data.status ?? "scheduled" } });
    return row as EmailRecord;
  }

  async createMany(rows: EmailBulkCreateData[]): Promise<void> {
    await this.prisma.email.createMany({
      data: rows.map((r) => ({ ...r, status: r.status ?? "scheduled" })),
    });
  }

  async findById(id: string): Promise<EmailRecord | null> {
    const row = await this.prisma.email.findUnique({ where: { id } });
    return row as EmailRecord | null;
  }

  async findScheduled(limit = 50, offset = 0): Promise<EmailRecord[]> {
    const rows = await this.prisma.email.findMany({ where: { status: "scheduled" }, orderBy: { scheduledAt: "asc" }, take: limit, skip: offset });
    return rows as EmailRecord[];
  }

  async findSent(limit = 50, offset = 0): Promise<EmailRecord[]> {
    const rows = await this.prisma.email.findMany({ where: { status: { in: ["sent", "failed"] } }, orderBy: { updatedAt: "desc" }, take: limit, skip: offset });
    return rows as EmailRecord[];
  }

  async updateStatus(id: string, status: EmailRecord["status"]): Promise<EmailRecord> {
    const row = await this.prisma.email.update({ where: { id }, data: { status } });
    return row as EmailRecord;
  }
}
