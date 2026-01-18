import { Express } from "express";
import { storage } from "../storage";
import { insertSupplierSchema, users } from "../../shared/schema";
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

export function registerSupplierRoutes(app: Express) {
  app.get("/api/suppliers", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      if (!await checkPermission(req, 'view_suppliers')) return res.status(403).json({ error: "Acesso negado" });
      const suppliers = await storage.getSuppliers(req.user.companyId);
      res.json(suppliers.map((s: any) => ({ ...s, totalPurchases: Number(s.totalPurchases || 0) })));
    } catch (error) {
      console.error("[Suppliers] list error", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      if (!await checkPermission(req, 'manage_suppliers')) return res.status(403).json({ error: "Acesso negado" });
      const cleanData: any = {};
      for (const [key, value] of Object.entries(req.body)) {
        cleanData[key] = (value === '' || value === undefined) ? null : value;
      }
      const data = insertSupplierSchema.parse(cleanData);
      const supplier = await storage.createSupplier(req.user.companyId, data);
      res.status(201).json(supplier);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid supplier data" });
    }
  });

  app.patch("/api/suppliers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      if (!await checkPermission(req, 'manage_suppliers')) return res.status(403).json({ error: "Acesso negado" });
      const cleanData: any = {};
      for (const [key, value] of Object.entries(req.body)) {
        cleanData[key] = (value === '' || value === undefined) ? null : value;
      }
      const data = insertSupplierSchema.partial().parse(cleanData);
      const supplier = await storage.updateSupplier(req.user.companyId, req.params.id, data);
      if (!supplier) return res.status(404).json({ error: "Supplier not found" });
      res.json(supplier);
    } catch (error: any) {
      console.error("[Suppliers] update error", error);
      res.status(400).json({ error: error.message || "Invalid supplier data" });
    }
  });

  app.delete("/api/suppliers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      if (!await checkPermission(req, 'manage_suppliers')) return res.status(403).json({ error: "Acesso negado" });
      await storage.deleteSupplier(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error: any) {
      console.error("[Suppliers] delete error", error);
      res.status(500).json({ error: error?.message || "Failed to delete supplier" });
    }
  });
}
