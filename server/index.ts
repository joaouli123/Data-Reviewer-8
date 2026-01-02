import express from "express";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { registerRoutes } from "./routes";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);
const isDev = process.env.NODE_ENV !== "production";

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Permitir Inline Scripts se necessário
  crossOriginEmbedderPolicy: false
}));

// Basic Rate Limiting
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_REQUESTS = 1000;

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
  if (userData.count > MAX_REQUESTS) {
    return res.status(429).json({ error: "Muitas requisições. Tente novamente mais tarde." });
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

// Serve static files in production
if (!isDev) {
  const staticPath = path.join(__dirname, "..", "dist", "public");
  app.use(express.static(staticPath));
  
  // SPA fallback
  app.get("*", (req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize server
(async () => {
  // Register all routes
  await registerRoutes(httpServer, app);

  // Start server
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`📝 Environment: ${isDev ? "development" : "production"}`);
    console.log(`🔐 Multi-tenant SaaS with Authentication`);
  });
})();

export default app;
