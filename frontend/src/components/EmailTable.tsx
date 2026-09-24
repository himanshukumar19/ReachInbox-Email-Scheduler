"use client";
import { Email } from "../types/email";
import { formatDateTime } from "../lib/utils";
import StatusBadge from "./StatusBadge";

type Column = "recipient" | "subject" | "scheduledAt" | "updatedAt" | "status";

type ColumnDef = {
  key: Column;
  label: string;
};

const columnDefs: Record<Column, ColumnDef> = {
  recipient: { key: "recipient", label: "Recipient" },
  subject: { key: "subject", label: "Subject" },
  scheduledAt: { key: "scheduledAt", label: "Scheduled" },
  updatedAt: { key: "updatedAt", label: "Sent" },
  status: { key: "status", label: "Status" },
};

type EmailTableProps = {
  emails: Email[];
  loading?: boolean;
  emptyText?: string;
  columns: Column[];
};

function CellValue({ email, column }: { email: Email; column: Column }) {
  if (column === "status") return <StatusBadge status={email.status} />;
  if (column === "scheduledAt") return <>{formatDateTime(email.scheduledAt)}</>;
  if (column === "updatedAt") return <>{formatDateTime(email.updatedAt)}</>;
  return <>{email[column]}</>;
}

export default function EmailTable({ emails, loading, emptyText, columns }: EmailTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!emails.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16">
        <p className="text-sm text-muted">{emptyText ?? "Nothing here yet"}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-page">
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-muted"
              >
                {columnDefs[col].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr
              key={email.id}
              className="border-b border-border transition-colors last:border-0 hover:bg-page"
            >
              {columns.map((col) => (
                <td key={col} className="px-4 py-3 text-primary">
                  <CellValue email={email} column={col} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
