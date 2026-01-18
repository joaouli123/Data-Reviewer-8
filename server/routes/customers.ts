import { Express } from "express";
import { storage } from "../storage";
import { insertCustomerSchema, users } from "../../shared/schema";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import { db } from "../db";
import { eq } from "drizzle-orm";

const checkPermission = async (req: AuthenticatedRequest, permission: string) => {
  if (req.user?.role === 'admin' || req.user?.isSuperAdmin) return true;
  const [dbUser] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
  if (!dbUser || !dbUser.permissions) return false;
  try {
    const perms = typeof dbUser.permissions === 'string' ? JSON.parse(dbUser.permissions) : dbUser.permissions;
    return !!perms[permission];
  } catch (e) { return false; }
};

export function registerCustomerRoutes(app: Express) {
  app.get("/api/customers", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      if (!await checkPermission(req, 'view_customers')) return res.status(403).json({ error: "Acesso negado" });
      const customers = await storage.getCustomers(req.user.companyId);
      res.json(customers.map((c: any) => ({ ...c, totalSales: Number(c.totalSales || 0) })));
    } catch (error) {
      console.error("[Customers] list error", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      if (!await checkPermission(req, 'manage_customers')) return res.status(403).json({ error: "Acesso negado" });
      const cleanData: any = {};
      for (const [key, value] of Object.entries(req.body)) {
        cleanData[key] = (value === '' || value === undefined) ? null : value;
      }
      const data = insertCustomerSchema.parse(cleanData);
      const customer = await storage.createCustomer(req.user.companyId, data);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid customer data" });
    }
  });

  app.patch("/api/customers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      if (!await checkPermission(req, 'manage_customers')) return res.status(403).json({ error: "Acesso negado" });
      const cleanData: any = {};
      for (const [key, value] of Object.entries(req.body)) {
        cleanData[key] = (value === '' || value === undefined) ? null : value;
      }
      const data = insertCustomerSchema.partial().parse(cleanData);
      const customer = await storage.updateCustomer(req.user.companyId, req.params.id, data);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json(customer);
    } catch (error: any) {
      console.error("[Customers] update error", error);
      res.status(400).json({ error: error.message || "Invalid customer data" });
    }
  });

  app.delete("/api/customers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      if (!await checkPermission(req, 'manage_customers')) return res.status(403).json({ error: "Acesso negado" });
      await storage.deleteCustomer(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error: any) {
      console.error("[Customers] delete error", error);
      res.status(500).json({ error: error?.message || "Failed to delete customer" });
    }
  });
}
