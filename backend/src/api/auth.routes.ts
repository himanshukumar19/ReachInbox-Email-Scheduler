import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export function authRouter(): Router {
  const r = Router();

  r.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  r.get("/google/callback", passport.authenticate("google", { session: false }), (req, res) => {
    const user = req.user as { id: string; email: string; name: string; avatar: string };
    const token = jwt.sign(user, env.jwtSecret, { expiresIn: "7d" });
    res.redirect(`${env.frontendUrl}/auth/callback?token=${token}`);
  });

  r.get("/me", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "unauthorized" });
    try {
      const payload = jwt.verify(auth.replace("Bearer ", ""), env.jwtSecret);
      res.json(payload);
    } catch {
      res.status(401).json({ error: "invalid token" });
    }
  });

  return r;
}
