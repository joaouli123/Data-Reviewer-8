import { Express } from "express";
<<<<<<< HEAD
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, requireSuperAdmin, AuthenticatedRequest } from "../middleware";
import { companies, users, subscriptions, auditLogs } from "../../shared/schema";
=======
import { db } from "../db.js";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, requireSuperAdmin, AuthenticatedRequest } from "../middleware.js";
import { companies, users, subscriptions, auditLogs } from "../../shared/schema.js";
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0

export function registerAdminRoutes(app: Express) {
  app.get("/api/admin/companies", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const allCompanies = await db.select().from(companies);
      res.json(allCompanies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.get("/api/admin/users", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/subscriptions", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const allSubscriptions = await db.select().from(subscriptions);
      res.json(allSubscriptions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  app.get("/api/admin/audit-logs", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });
}
