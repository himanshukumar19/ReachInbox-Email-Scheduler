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

const skeletonWidths: Record<Column, string> = {
  recipient: "w-40",
  subject: "w-56",
  scheduledAt: "w-32",
  updatedAt: "w-32",
  status: "w-16",
};

type EmailTableProps = {
  emails: Email[];
  loading?: boolean;
  emptyText?: string;
  columns: Column[];
};

function SkeletonCell({ column }: { column: Column }) {
  return (
    <div
      className={`h-3.5 animate-pulse rounded-sm bg-border ${skeletonWidths[column]}`}
    />
  );
}

function SkeletonRows({ columns, count }: { columns: Column[]; count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-border last:border-0">
          {columns.map((col) => (
            <td key={col} className="px-4 py-3.5">
              <SkeletonCell column={col} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function CellValue({ email, column }: { email: Email; column: Column }) {
  if (column === "status") return <StatusBadge status={email.status} />;
  if (column === "scheduledAt") return <>{formatDateTime(email.scheduledAt)}</>;
  if (column === "updatedAt") return <>{formatDateTime(email.updatedAt)}</>;
  return <>{email[column]}</>;
}

export default function EmailTable({ emails, loading, emptyText, columns }: EmailTableProps) {
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
          {loading ? (
            <SkeletonRows columns={columns} count={5} />
          ) : emails.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center text-sm text-muted">
                {emptyText ?? "Nothing here yet"}
              </td>
            </tr>
          ) : (
            emails.map((email) => (
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
