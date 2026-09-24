import dotenv from "dotenv";
dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  databaseUrl: requireEnv("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  jwtSecret: requireEnv("JWT_SECRET", "dev-secret"),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleCallback: process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:4000/api/auth/google/callback",
  etherealHost: process.env.ETHEREAL_HOST ?? "smtp.ethereal.email",
  etherealPort: parseInt(process.env.ETHEREAL_PORT ?? "587", 10),
  etherealUser: process.env.ETHEREAL_USER ?? "",
  etherealPass: process.env.ETHEREAL_PASS ?? "",
  maxPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR ?? "50", 10),
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10),
  delayMs: parseInt(process.env.DELAY_BETWEEN_SENDS_MS ?? "1000", 10),
};
