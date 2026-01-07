import express from "express";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import helmet from "helmet";
<<<<<<< HEAD
import { registerAllRoutes } from "./routes/index";
=======
import { registerAllRoutes } from "./routes/index.js";
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);
const isDev = process.env.NODE_ENV !== "production";

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Basic Rate Limiting
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 1 * 60 * 1000;
const MAX_REQUESTS = 100000000;

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
<<<<<<< HEAD
app.use(cookieParser());
=======
app.use(cookieParser() as any);
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0

// Get __dirname from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register API routes
registerAllRoutes(app);

// Create HTTP server
const httpServer = http.createServer(app);

(async () => {
  if (isDev) {
<<<<<<< HEAD
    const { setupVite } = await import("./vite");
=======
    const { setupVite } = await import("./vite.js");
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0
    // setupVite in this environment expects (server, app)
    await setupVite(httpServer, app);
  } else {
    const staticPath = path.join(__dirname, "..", "dist", "public");
    app.use(express.static(staticPath));
<<<<<<< HEAD
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
=======
    
    // Todas as outras rotas que não começam com /api devem servir o frontend
    app.get("*", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Evita capturar rotas de API no wildcard do frontend
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(staticPath, "index.html"), (err) => {
        if (err) {
          res.status(500).send(err);
        }
      });
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0
    });
  }

  // Start server
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
})();

export default app;
