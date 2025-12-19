import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // API routes go here
  // Prefix all routes with /api
  // Use storage interface for CRUD operations

  return httpServer;
}
