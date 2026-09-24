"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import Header from "../components/Header";
import EmailTable from "../components/EmailTable";
import ComposeModal from "../components/ComposeModal";
import LoginPage from "../components/LoginPage";
import { fetchMe, fetchScheduled, fetchSent } from "../lib/api";
import { googleAuthUrl } from "../lib/utils";

type Tab = "scheduled" | "sent";

const tabConfig: { id: Tab; label: string }[] = [
  { id: "scheduled", label: "Scheduled" },
  { id: "sent", label: "Sent" },
];

export default function RootPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("scheduled");
  const [composeOpen, setComposeOpen] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
  });

  const scheduled = useQuery({
    queryKey: ["scheduled"],
    queryFn: () => fetchScheduled(),
    enabled: !!user,
    refetchInterval: 15_000,
  });

  const sent = useQuery({
    queryKey: ["sent"],
    queryFn: () => fetchSent(),
    enabled: !!user,
    refetchInterval: 15_000,
  });

  function handleLogout() {
    localStorage.removeItem("token");
    window.location.href = googleAuthUrl();
    queryClient.clear();
  }

  function handleScheduled() {
    queryClient.invalidateQueries({ queryKey: ["scheduled"] });
    queryClient.invalidateQueries({ queryKey: ["sent"] });
  }

  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <Toaster position="bottom-right" />
      </>
    );
  }

  const activeData = tab === "scheduled" ? scheduled : sent;
  const tableColumns =
    tab === "scheduled"
      ? (["recipient", "subject", "scheduledAt", "status"] as const)
      : (["recipient", "subject", "updatedAt", "status"] as const);
  const emptyText =
    tab === "scheduled" ? "No emails queued — compose one to get started" : "No sent emails yet";

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header onLogout={handleLogout} />
      <Toaster position="bottom-right" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-sm border border-border bg-surface p-1">
            {tabConfig.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`focus-ring rounded-sm px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab === id
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:bg-page hover:text-primary"
                }`}
              >
                {label}
                <span
                  className={`ml-2 rounded-sm px-1.5 py-0.5 text-2xs font-semibold ${
                    tab === id ? "bg-white/20 text-white" : "bg-page text-muted"
                  }`}
                >
                  {tab === id
                    ? activeData.data?.length ?? "—"
                    : id === "scheduled"
                    ? scheduled.data?.length ?? "—"
                    : sent.data?.length ?? "—"}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setComposeOpen(true)}
            className="focus-ring flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <span aria-hidden="true">+</span>
            Compose
          </button>
        </div>

        <div className="rounded-lg border border-border bg-surface">
          <EmailTable
            emails={activeData.data ?? []}
            loading={activeData.isLoading}
            columns={[...tableColumns]}
            emptyText={emptyText}
          />
        </div>
      </main>

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onScheduled={handleScheduled}
      />
    </div>
  );
}
