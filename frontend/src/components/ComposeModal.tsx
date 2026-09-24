"use client";
import { useState } from "react";
import Papa from "papaparse";
import { scheduleEmails } from "../lib/api";
import { toast } from "sonner";

export default function ComposeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sender, setSender] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  if (!open) return null;

  function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      complete: (res) => {
        const emails = (res.data as string[][]).flat().map(s => String(s).trim()).filter(s => /@/.test(s));
        setRecipients(emails);
        toast.success(`${emails.length} valid addresses found`);
      },
    });
  }

  async function submit() {
    await scheduleEmails({ recipients, subject, body, sender, scheduledAt: new Date(scheduledAt).toISOString() });
    toast.success(`Scheduled ${recipients.length} emails`);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">Compose New Email</h2>
        <input placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} className="w-full rounded border px-3 py-2" />
        <textarea placeholder="Body" value={body} onChange={e=>setBody(e.target.value)} className="w-full rounded border px-3 py-2" rows={4} />
        <input placeholder="Sender email" value={sender} onChange={e=>setSender(e.target.value)} className="w-full rounded border px-3 py-2" />
        <input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="w-full rounded border px-3 py-2" />
        <div><input type="file" accept=".csv,.txt" onChange={onCsv} /><p className="text-xs text-gray-500">{recipients.length} addresses detected</p></div>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded border px-4 py-2">Cancel</button><button onClick={submit} className="rounded bg-blue-600 px-4 py-2 text-white">Schedule</button></div>
      </div>
    </div>
  );
}
