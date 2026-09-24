"use client";
import { useState } from "react";
import Header from "../components/Header";
import EmailTable from "../components/EmailTable";
import ComposeModal from "../components/ComposeModal";
import { useQuery } from "@tanstack/react-query";
import { fetchScheduled, fetchSent } from "../lib/api";

export default function Dashboard() {
  const [tab, setTab] = useState<"scheduled"|"sent">("scheduled");
  const [open, setOpen] = useState(false);
  const scheduled = useQuery({ queryKey: ["scheduled"], queryFn: fetchScheduled });
  const sent = useQuery({ queryKey: ["sent"], queryFn: fetchSent });
  return (
    <div>
      <Header name="Demo User" email="demo@reachinbox.ai" />
      <main className="mx-auto max-w-5xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={()=>setTab("scheduled")} className={`rounded px-4 py-2 ${tab==="scheduled" ? "bg-gray-900 text-white" : "border"}`}>Scheduled</button>
            <button onClick={()=>setTab("sent")} className={`rounded px-4 py-2 ${tab==="sent" ? "bg-gray-900 text-white" : "border"}`}>Sent</button>
          </div>
          <button onClick={()=>setOpen(true)} className="rounded bg-blue-600 px-4 py-2 text-white">Compose New Email</button>
        </div>
        <div className="mt-6 rounded border">
          {tab==="scheduled" ? <EmailTable emails={scheduled.data ?? []} loading={scheduled.isLoading} columns={["email","subject","scheduledAt","status"]} emptyText="No scheduled emails" /> : <EmailTable emails={sent.data ?? []} loading={sent.isLoading} columns={["email","subject","sentAt","status"]} emptyText="No sent emails" />}
        </div>
      </main>
      <ComposeModal open={open} onClose={()=>setOpen(false)} />
    </div>
  );
}
