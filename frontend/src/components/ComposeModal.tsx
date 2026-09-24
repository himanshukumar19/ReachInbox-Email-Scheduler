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
  const [delayBetweenMs, setDelayBetweenMs] = useState(1000);

  if (!open) return null;

  function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      complete: (res) => {
        const raw = (res.data as string[][]).flat().map((s) => String(s).trim());
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const deduped = [...new Set(raw.filter((s) => emailRe.test(s)).map((s) => s.toLowerCase()))];
        setRecipients(deduped);
        toast.success(`${deduped.length} valid addresses found`);
      },
    });
  }

  async function submit() {
    await scheduleEmails({ recipients, subject, body, sender, scheduledAt: new Date(scheduledAt).toISOString(), delayBetweenMs });
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
        <label className="block text-sm font-medium">Delay between emails (ms)<input type="number" min={0} value={delayBetweenMs} onChange={e=>setDelayBetweenMs(parseInt(e.target.value,10)||0)} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <div><input type="file" accept=".csv,.txt" onChange={onCsv} /><p className="text-xs text-gray-500">{recipients.length} addresses detected</p>{recipients.length === 0 ? <p className="text-xs text-red-500">Add at least one valid recipient</p> : null}</div>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded border px-4 py-2">Cancel</button><button onClick={submit} disabled={recipients.length === 0} className={`rounded px-4 py-2 text-white ${recipients.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600"}`}>Schedule</button></div>
      </div>
    </div>
  );
}
