import prisma from "../db.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[process.env.COOKIE_NAME || "sid"];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const payload = jwt.verify(token, JWT_SECRET);
    // check session in DB for revocation
    const session = await prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }
    // load user
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, emailVerified: true, isAdmin: true }
    });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // attach to request
    req.userId = user.id;
    req.user = user;
    req.sessionId = session.id;
    next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireAdmin(req, res, next) {
  // assume requireAuth ran before and set req.user
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden — admin only" });
  }
  next();
}
