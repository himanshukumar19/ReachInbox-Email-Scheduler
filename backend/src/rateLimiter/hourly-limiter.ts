import { getRedis } from "../config/redis";
import { env } from "../config/env";

export function hourWindowKey(sender: string, date: Date): string {
  const hour = date.toISOString().slice(0, 13);
  return `rate:${sender}:${hour}`;
}

export function msUntilNextHour(from: Date = new Date()): number {
  const next = new Date(from);
  next.setMinutes(60, 0, 0);
  return next.getTime() - from.getTime();
}

export async function checkAndIncrement(sender: string): Promise<{ allowed: boolean; count: number }> {
  const redis = getRedis();
  const key = hourWindowKey(sender, new Date());
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 3600);
  return { allowed: count <= env.maxPerHour, count };
}
