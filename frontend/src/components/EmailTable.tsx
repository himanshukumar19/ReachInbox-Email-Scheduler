import { Email } from "../types/email";

type Props = { emails: Email[]; loading?: boolean; emptyText?: string; columns: ("email"|"subject"|"scheduledAt"|"sentAt"|"status")[] };
export default function EmailTable({ emails, loading, emptyText, columns }: Props) {
  if (loading) return <p className="py-8 text-center text-gray-500">Loading...</p>;
  if (!emails.length) return <p className="py-8 text-center text-gray-500">{emptyText ?? "No emails yet"}</p>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-left"><tr>{columns.map(c => <th key={c} className="px-4 py-2 capitalize">{c}</th>)}</tr></thead>
      <tbody>{emails.map(e => <tr key={e.id} className="border-t"><td className="px-4 py-2">{e.recipient}</td><td className="px-4 py-2">{e.subject}</td><td className="px-4 py-2">{e.scheduledAt ?? e.updatedAt}</td><td className="px-4 py-2"><span className="rounded bg-gray-100 px-2 py-0.5">{e.status}</span></td></tr>)}</tbody>
    </table>
  );
}
