import express from "express";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);
const isDev = process.env.NODE_ENV !== "production";

// Middleware
app.use(express.json());
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

// Register all routes
registerRoutes(httpServer, app);

// Start server
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📝 Environment: ${isDev ? "development" : "production"}`);
  console.log(`🔐 Multi-tenant SaaS with Authentication`);
});

export default app;
