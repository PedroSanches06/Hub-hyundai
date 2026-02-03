import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import csrf from "csurf";
import dotenv from "dotenv";
dotenv.config();

import authRoutes from "./routes/auth.js";
import fileRoutes from "./routes/files.js";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1); // if behind proxy/load balancer

// Rate limiting (adjust to your needs)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// CSRF protection for state-changing routes (safe with cookie-based sessions)
const csrfProtection = csrf({ cookie: false }); // we use token in header

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes(csrfProtection));
app.use("/files", fileRoutes);

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
// logo após as outras rotas
import adminRoutes from "./routes/admin.js";
// ...
app.use("/admin", adminRoutes);
