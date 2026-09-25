import IORedis from "ioredis";
import { env } from "./env";

let instance: IORedis | null = null;

export function getRedis(): IORedis {
  if (!instance) {
    instance = new IORedis(env.redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });
  instance.on('connect', () => console.log('REDIS CONNECT'));
  instance.on('ready', () => console.log('REDIS READY'));
  instance.on('error', (err) => console.error('REDIS ERROR', err));
  }
  return instance;
}
