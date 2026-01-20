import express from "express";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import helmet from "helmet";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);
const TRUST_PROXY = process.env.TRUST_PROXY === "true";
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

if (TRUST_PROXY) {
  app.set("trust proxy", 1);
}

console.log(`[Server] Starting in production mode on port ${PORT}`);
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

// Basic Rate Limiting (global fallback)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 600);

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

  if (userData.count > RATE_LIMIT_MAX) {
    res.setHeader("Retry-After", String(Math.ceil((userData.lastReset + RATE_LIMIT_WINDOW - now) / 1000)));
    return res.status(429).json({ error: "Too many requests" });
  }
  next();
});

// CORS (allowlist)
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;

  if (origin && allowedOrigins.has(origin)) {
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

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Get __dirname from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create HTTP server
const httpServer = http.createServer(app);

const shutdown = (signal: string) => {
  console.log(`[Server] Received ${signal}, shutting down...`);
  httpServer.close(() => {
    console.log("[Server] Closed out remaining connections");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

(async () => {
  try {
    // Register API routes (requires DATABASE_URL)
    if (process.env.DATABASE_URL) {
      const { registerAllRoutes } = await import("./routes/index");
      registerAllRoutes(app);
      console.log("[Server] API routes registered");
    } else {
      console.warn("[Server] DATABASE_URL not set - API routes disabled");
    }

    // Serve static files
    const staticPath = path.join(__dirname, "..", "dist", "public");
    console.log(`[Server] Serving static files from: ${staticPath}`);
    app.use(express.static(staticPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });

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
