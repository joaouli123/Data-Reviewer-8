import { Express } from "express";
import authRoutes from "./auth";
import adminRoutes from "./admin";
import customerRoutes from "./customers";
import { type Server } from "http";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Public Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Authentication Routes
  app.use("/api/auth", authRoutes);
  
  // Admin Routes
  app.use("/api/admin", adminRoutes);
  
  // Customer Routes
  app.use("/api/customers", customerRoutes);

  return httpServer;
}
