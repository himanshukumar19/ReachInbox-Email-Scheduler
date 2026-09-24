import axios from "axios";
import { CurrentUser, Email, SchedulePayload, ScheduleResponse } from "../types/email";

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  withCredentials: false,
});

client.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function fetchMe(): Promise<CurrentUser | null> {
  try {
    const { data } = await client.get<CurrentUser>("/api/auth/me");
    return data;
  } catch {
    return null;
  }
}

export async function scheduleEmails(payload: SchedulePayload): Promise<ScheduleResponse> {
  const { data } = await client.post<ScheduleResponse>("/api/emails/schedule", payload);
  return data;
}

export async function fetchScheduled(limit = 50, offset = 0): Promise<Email[]> {
  const { data } = await client.get<Email[]>("/api/emails/scheduled", {
    params: { limit, offset },
  });
  return data;
}

export async function fetchSent(limit = 50, offset = 0): Promise<Email[]> {
  const { data } = await client.get<Email[]>("/api/emails/sent", {
    params: { limit, offset },
  });
  return data;
}
