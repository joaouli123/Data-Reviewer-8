import express from "express";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import helmet from "helmet";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

console.log(`[Server] Starting in production mode on port ${PORT}`);

// Health check - FIRST (before any db-dependent routes)
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

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
