import express from "express";
import prisma from "../db.js";
import argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../utils/email.js";
import { requireAuth } from "../middleware/auth.js";
import jwt from "jsonwebtoken";

const router = express.Router();

function authRoutes(csrfProtection) {
  // Register
  router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing email or password" });
    if (password.length < 12) return res.status(400).json({ error: "Password too short (min 12 chars)" });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.user.create({
      data: { email, passwordHash: hash }
    });

    // create verification token (store hashed)
    const token = uuidv4();
    const tokenHash = await argon2.hash(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    await prisma.verificationToken.create({
      data: { tokenHash, userId: user.id, expiresAt }
    });

    const link = `${process.env.FRONTEND_URL}/auth/verify?token=${token}&uid=${user.id}`;
    await sendEmail(user.email, "Verifique seu e-mail", `<p>Verifique seu e-mail clicando <a href="${link}">aqui</a></p>`);
    res.json({ ok: true, message: "Registered. Check your email to verify account." });
  });

  // Verify email
  router.get("/verify", async (req, res) => {
    const { token, uid } = req.query;
    if (!token || !uid) return res.status(400).json({ error: "Invalid request" });

    const vt = await prisma.verificationToken.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    for (const t of vt) {
      if (new Date(t.expiresAt) < new Date()) continue;
      try {
        if (await argon2.verify(t.tokenHash, token)) {
          await prisma.user.update({ where: { id: uid }, data: { emailVerified: true } });
          await prisma.verificationToken.deleteMany({ where: { userId: uid } });
          return res.json({ ok: true, message: "Email verified" });
        }
      } catch (e) {
        // ignore
      }
    }
    return res.status(400).json({ error: "Invalid or expired token" });
  });

  // Login
  router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    if (!user.emailVerified) return res.status(403).json({ error: "Email not verified" });

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    // create session
    const sid = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    await prisma.session.create({
      data: {
        id: sid,
        userId: user.id,
        expiresAt,
        userAgent: req.headers["user-agent"] || null,
        ip: req.ip
      }
    });

    const token = jwt.sign({ sid }, process.env.JWT_SECRET, { expiresIn: "24h" });

    res.cookie(process.env.COOKIE_NAME || "sid", token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "strict",
      // domain: process.env.COOKIE_DOMAIN // set if needed
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ ok: true });
  });

  // Logout
  router.post("/logout", requireAuth, async (req, res) => {
    const token = req.cookies?.[process.env.COOKIE_NAME || "sid"];
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      await prisma.session.deleteMany({ where: { id: payload.sid } });
    } catch (e) { /* ignore */ }
    res.clearCookie(process.env.COOKIE_NAME || "sid");
    res.json({ ok: true });
  });

  // Protected ping
  router.get("/me", requireAuth, async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, email: true, emailVerified: true } });
    res.json({ user });
  });

  return router;
}

export default authRoutes;
