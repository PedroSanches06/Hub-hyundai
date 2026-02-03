import express from "express";
import { requireAuth } from "../middleware/auth.js";
import prisma from "../db.js";
import { getUploadPresign, getDownloadPresign } from "../utils/s3.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Generate presigned upload url (client uploads directly to S3)
router.post("/presign-upload", requireAuth, async (req, res) => {
  const { filename, contentType, size } = req.body;
  if (!filename || !contentType || !size) return res.status(400).json({ error: "Missing parameters" });

  // TODO: validate contentType, max size, file extension whitelist
  const key = `${req.userId}/${uuidv4()}_${filename}`;
  const ttl = Number(process.env.PRESIGN_TTL || 300);

  const url = await getUploadPresign(key, contentType, ttl);

  // create metadata entry in DB (status: pending) — here we create immediately
  await prisma.fileMeta.create({
    data: {
      key,
      filename,
      contentType,
      size: Number(size),
      ownerId: req.userId
    }
  });

  res.json({ url, key, expiresIn: ttl });
});

// Get presigned download url (server authorizes then returns short-lived URL)
router.get("/presign-download/:key", requireAuth, async (req, res) => {
  const key = req.params.key;
  const meta = await prisma.fileMeta.findUnique({ where: { key } });
  if (!meta) return res.status(404).json({ error: "Not found" });
  if (meta.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });

  const ttl = Number(process.env.PRESIGN_TTL || 300);
  const url = await getDownloadPresign(key, ttl);
  res.json({ url, expiresIn: ttl });
});

export default router;
