"use client";
import { EmailStatus } from "../types/email";

type StatusBadgeProps = { status: EmailStatus };

const statusConfig: Record<EmailStatus, { label: string; className: string }> = {
  scheduled: {
    label: "Pending",
    className: "bg-badge-pending-bg text-badge-pending-text",
  },
  sent: {
    label: "Sent",
    className: "bg-badge-sent-bg text-badge-sent-text",
  },
  failed: {
    label: "Failed",
    className: "bg-badge-failed-bg text-badge-failed-text",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-2xs font-medium tracking-wide uppercase ${className}`}
    >
      {label}
    </span>
  );
}
