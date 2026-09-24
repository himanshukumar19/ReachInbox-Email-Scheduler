import IORedis from "ioredis";
import { env } from "./env";

let instance: IORedis | null = null;

export function getRedis(): IORedis {
  if (!instance) {
    instance = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
  }
  return instance;
}
