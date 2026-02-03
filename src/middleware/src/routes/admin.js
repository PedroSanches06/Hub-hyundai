import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve admin dashboard (protege o arquivo)
router.get("/", requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "admin.html"));
});

// API para obter dados do admin autenticado
router.get("/me", requireAuth, requireAdmin, (req, res) => {
  res.json({ user: req.user });
});

export default router;
