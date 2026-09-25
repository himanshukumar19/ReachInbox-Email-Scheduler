"use client";
import { useRef, useState } from "react";
import Papa from "papaparse";
import { scheduleEmails } from "../lib/api";
import { toast } from "sonner";
import { SchedulePayload } from "../types/email";

type ComposeModalProps = { open: boolean; onClose: () => void; onScheduled: () => void };

type FormState = {
  subject: string;
  body: string;
  sender: string;
  scheduledAt: string;
  delayBetweenMs: number;
  hourlyLimit: number;
};

type FormErrors = Partial<Record<keyof FormState | "recipients", string>>;

const initialForm: FormState = {
  subject: "",
  body: "",
  sender: "",
  scheduledAt: "",
  delayBetweenMs: 1000,
  hourlyLimit: 50,
};

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmailsFromRows(rows: string[][]): string[] {
  const flat = rows.flat().map((s) => String(s).trim()).filter((s) => s !== "");
  const valid = flat.filter((s) => emailRe.test(s)).map((s) => s.toLowerCase());
  return Array.from(new Set(valid));
}

function validateForm(form: FormState, recipients: string[]): FormErrors {
  const errors: FormErrors = {};
  if (!form.subject.trim()) errors.subject = "Subject is required";
  if (form.subject.length > 300) errors.subject = "Subject must be 300 characters or fewer";
  if (!form.body.trim()) errors.body = "Body is required";
  if (!form.sender.trim()) errors.sender = "Sender email is required";
  else if (!emailRe.test(form.sender)) errors.sender = "Enter a valid email address";
  if (!form.scheduledAt) {
    errors.scheduledAt = "Start time is required";
  } else if (new Date(form.scheduledAt) <= new Date()) {
    errors.scheduledAt = "Start time must be in the future";
  }
  if (recipients.length === 0) errors.recipients = "Upload a CSV with at least one valid address";
  return errors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-2xs text-badge-failed-text">{message}</p>;
}

function FormLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-primary">
      {children}
    </label>
  );
}

function InputField({
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  min,
}: {
  id: string;
  type?: string;
  placeholder?: string;
  value: string | number;
  onChange: (v: string) => void;
  error?: string;
  min?: number;
}) {
  return (
    <div>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className={`focus-ring mt-1 w-full rounded-sm border bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none ${
          error ? "border-badge-failed-text" : "border-border"
        }`}
      />
      <FieldError message={error} />
    </div>
  );
}

export default function ComposeModal({ open, onClose, onScheduled }: ComposeModalProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<string[]>(file, {
      complete: (res) => {
        const allNonEmpty = res.data
          .flat()
          .map((s) => String(s).trim())
          .filter((s) => s !== "");
        const valid = Array.from(
          new Set(allNonEmpty.filter((s) => emailRe.test(s)).map((s) => s.toLowerCase()))
        );
        const skipped = allNonEmpty.length - valid.length;
        setRecipients(valid);
        setSkippedCount(skipped);
        setErrors((prev) => ({ ...prev, recipients: undefined }));
        if (valid.length > 0) {
          toast.success(
            `${valid.length} valid address${valid.length !== 1 ? "es" : ""} found${skipped > 0 ? ` — ${skipped} invalid row${skipped !== 1 ? "s" : ""} skipped` : ""}`
          );
        } else {
          toast.error("No valid email addresses found in the file");
        }
      },
    });
  }

  async function handleSubmit() {
    const validationErrors = validateForm(form, recipients);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload: SchedulePayload = {
      recipients,
      subject: form.subject,
      body: form.body,
      sender: form.sender,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      delayBetweenMs: form.delayBetweenMs,
      hourlyLimit: form.hourlyLimit,
    };

    setSubmitting(true);
    try {
      const result = await scheduleEmails(payload);
      toast.success(`${result.count} email${result.count !== 1 ? "s" : ""} scheduled`);
      setForm(initialForm);
      setRecipients([]);
      setSkippedCount(0);
      if (fileRef.current) fileRef.current.value = "";
      onScheduled();
      onClose();
    } catch {
      toast.error("Failed to schedule emails. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setForm(initialForm);
    setRecipients([]);
    setSkippedCount(0);
    setErrors({});
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-title"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="compose-title" className="text-base font-semibold text-primary">
            Schedule emails
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-sm text-muted transition-colors hover:bg-page hover:text-primary"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-4">
            <div>
              <FormLabel htmlFor="subject">Subject</FormLabel>
              <InputField
                id="subject"
                placeholder="Email subject"
                value={form.subject}
                onChange={(v) => setField("subject", v)}
                error={errors.subject}
              />
            </div>

            <div>
              <FormLabel htmlFor="body">Body</FormLabel>
              <div>
                <textarea
                  id="body"
                  placeholder="Email content…"
                  value={form.body}
                  rows={5}
                  onChange={(e) => setField("body", e.target.value)}
                  className={`focus-ring mt-1 w-full resize-y rounded-sm border bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none ${
                    errors.body ? "border-badge-failed-text" : "border-border"
                  }`}
                />
                <FieldError message={errors.body} />
              </div>
            </div>

            <div>
              <FormLabel htmlFor="sender">Sender email</FormLabel>
              <InputField
                id="sender"
                type="email"
                placeholder="you@example.com"
                value={form.sender}
                onChange={(v) => setField("sender", v)}
                error={errors.sender}
              />
            </div>

            <div>
              <FormLabel htmlFor="scheduledAt">Start time</FormLabel>
              <InputField
                id="scheduledAt"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(v) => setField("scheduledAt", v)}
                error={errors.scheduledAt}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel htmlFor="delay">Delay between sends (ms)</FormLabel>
                <InputField
                  id="delay"
                  type="number"
                  min={0}
                  value={form.delayBetweenMs}
                  onChange={(v) => setField("delayBetweenMs", parseInt(v, 10) || 0)}
                  error={errors.delayBetweenMs}
                />
              </div>
              <div>
                <FormLabel htmlFor="hourlyLimit">Hourly limit</FormLabel>
                <InputField
                  id="hourlyLimit"
                  type="number"
                  min={1}
                  value={form.hourlyLimit}
                  onChange={(v) => setField("hourlyLimit", parseInt(v, 10) || 50)}
                  error={errors.hourlyLimit}
                />
              </div>
            </div>

            <div>
              <FormLabel htmlFor="csvFile">Recipients</FormLabel>
              <div
                className={`mt-1 rounded-sm border border-dashed px-4 py-4 ${
                  errors.recipients
                    ? "border-badge-failed-text bg-badge-failed-bg/30"
                    : "border-border bg-page"
                }`}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <input
                    id="csvFile"
                    ref={fileRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="csvFile"
                    className="focus-ring cursor-pointer rounded-sm border border-border bg-surface px-3 py-1.5 text-sm text-primary transition-colors hover:bg-page"
                  >
                    Choose file
                  </label>
                  {recipients.length > 0 ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-badge-sent-text">
                        {recipients.length} valid address{recipients.length !== 1 ? "es" : ""} detected
                      </p>
                      {skippedCount > 0 && (
                        <p className="text-2xs text-muted">
                          {skippedCount} invalid row{skippedCount !== 1 ? "s" : ""} skipped
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">CSV or plain text, one address per line</p>
                  )}
                </div>
              </div>
              <FieldError message={errors.recipients} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={handleClose}
            className="focus-ring rounded-sm border border-border bg-surface px-4 py-2 text-sm text-primary transition-colors hover:bg-page"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="focus-ring rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
