import express from "express";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./config/env";
import { PrismaEmailRepository } from "./repositories/prisma-email.repository";
import { EtherealProvider } from "./mail/ethereal-provider";
import { scheduleRouter } from "./api/schedule.routes";
import { authRouter } from "./api/auth.routes";
import { createEmailWorker } from "./queue/worker";
import { getPrisma } from "./db/prisma-client";

const app = express();
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());
app.use(passport.initialize());

if (env.googleClientId) {
  passport.use(
    new GoogleStrategy(
      { clientID: env.googleClientId, clientSecret: env.googleSecret, callbackURL: env.googleCallback },
      async (_a, _b, profile, done) => {
        const prisma = getPrisma();
        const email = profile.emails?.[0]?.value ?? "";
        let user = await prisma.user.findUnique({ where: { googleId: profile.id } });
        if (!user) {
          user = await prisma.user.create({ data: { googleId: profile.id, email, name: profile.displayName, avatar: profile.photos?.[0]?.value } });
        }
        done(null, { id: user.id, email: user.email, name: user.name, avatar: user.avatar });
      }
    )
  );
}

const repository = new PrismaEmailRepository();
const mailProvider = new EtherealProvider();

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/emails", scheduleRouter(repository));
app.use("/api/auth", authRouter());

createEmailWorker(repository, mailProvider);

app.listen(env.port, () => console.log(`Backend listening on ${env.port}`));
