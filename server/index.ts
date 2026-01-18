import 'dotenv/config';
import express from "express";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { pool } from "./db";

import { checkAndSendSubscriptionEmails } from "./api/subscription-cron";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);
const isDev = process.env.NODE_ENV !== "production";
const defaultAllowedOrigins = ["https://huacontrol.com.br", "https://www.huacontrol.com.br"];
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || process.env.APP_URL || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
);
if (allowedOrigins.size === 0) {
  defaultAllowedOrigins.forEach(origin => allowedOrigins.add(origin));
}

async function ensureCoreSchema() {
  try {
    await pool.query(`
      ALTER TABLE IF EXISTS customers
        ADD COLUMN IF NOT EXISTS company_id varchar,
        ADD COLUMN IF NOT EXISTS cpf text,
        ADD COLUMN IF NOT EXISTS cnpj text,
        ADD COLUMN IF NOT EXISTS category text;

      ALTER TABLE IF EXISTS suppliers
        ADD COLUMN IF NOT EXISTS company_id varchar,
        ADD COLUMN IF NOT EXISTS cpf text,
        ADD COLUMN IF NOT EXISTS cnpj text,
        ADD COLUMN IF NOT EXISTS category text,
        ADD COLUMN IF NOT EXISTS payment_terms text;

      ALTER TABLE IF EXISTS transactions
        ADD COLUMN IF NOT EXISTS company_id varchar,
        ADD COLUMN IF NOT EXISTS category_id varchar,
        ADD COLUMN IF NOT EXISTS paid_amount numeric(15, 2),
        ADD COLUMN IF NOT EXISTS interest numeric(15, 2) DEFAULT '0',
        ADD COLUMN IF NOT EXISTS payment_date timestamp,
        ADD COLUMN IF NOT EXISTS installment_group text,
        ADD COLUMN IF NOT EXISTS installment_number integer,
        ADD COLUMN IF NOT EXISTS installment_total integer,
        ADD COLUMN IF NOT EXISTS payment_method text,
        ADD COLUMN IF NOT EXISTS is_reconciled boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now(),
        ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

      CREATE TABLE IF NOT EXISTS categories (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        name text NOT NULL,
        type text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bank_statement_items (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        date timestamp NOT NULL,
        amount numeric(15, 2) NOT NULL,
        description text NOT NULL,
        status text DEFAULT 'PENDING' NOT NULL,
        transaction_id varchar,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);
  } catch (error) {
    console.error("[Server] Schema patch error:", error);
  }
}

// Mock cron job - in production this would be a real cron job
// Run once on startup and then every 24 hours
if (process.env.DATABASE_URL) {
  checkAndSendSubscriptionEmails();
  setInterval(checkAndSendSubscriptionEmails, 24 * 60 * 60 * 1000);
}

console.log(`[Server] Starting in ${isDev ? 'development' : 'production'} mode`);
console.log(`[Server] PORT: ${PORT}`);
console.log(`[Server] DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);

// Health check - FIRST (before any db-dependent routes)
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS (allowlist)
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;

  if (origin && (isDev || allowedOrigins.has(origin))) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Basic Rate Limiting
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 1 * 60 * 1000;

app.use((req, res, next) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const userData = rateLimitMap.get(ip) || { count: 0, lastReset: now };

  if (now - userData.lastReset > RATE_LIMIT_WINDOW) {
    userData.count = 1;
    userData.lastReset = now;
  } else {
    userData.count++;
  }
  rateLimitMap.set(ip, userData);
  next();
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Get __dirname from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create HTTP server
const httpServer = http.createServer(app);

(async () => {
  try {
    if (process.env.DATABASE_URL) {
      await ensureCoreSchema();
    }
    // Register API routes (requires DATABASE_URL)
    if (process.env.DATABASE_URL) {
      const { registerAllRoutes } = await import("./routes/index");
      registerAllRoutes(app);
      console.log("[Server] API routes registered");
    } else {
      console.warn("[Server] DATABASE_URL not set - API routes disabled");
    }

    if (isDev) {
      // Development: use Vite dev server (only imported in dev)
      const viteModule = await import("./vite");
      await viteModule.setupVite(httpServer, app);
    } else {
      // Production: serve static files
      const staticPath = path.join(__dirname, "..", "dist", "public");
      console.log(`[Server] Serving static files from: ${staticPath}`);
      app.use(express.static(staticPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(staticPath, "index.html"));
      });
    }

    // Start server
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("[Server] Fatal error during startup:", error);
    process.exit(1);
  }
})();

export default app;
