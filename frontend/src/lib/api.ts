import axios from "axios";
import { Email, SchedulePayload } from "../types/email";

const client = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000" });

export async function scheduleEmails(payload: SchedulePayload): Promise<{ ids: string[]; count: number }> {
  const { data } = await client.post("/api/emails/schedule", payload);
  return data;
}
export async function fetchScheduled(): Promise<Email[]> {
  const { data } = await client.get("/api/emails/scheduled");
  return data;
}
export async function fetchSent(): Promise<Email[]> {
  const { data } = await client.get("/api/emails/sent");
  return data;
}
