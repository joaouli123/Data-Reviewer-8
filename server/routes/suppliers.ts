import { Express } from "express";
import { storage } from "../storage";
import { insertSupplierSchema } from "../../shared/schema";
import { authMiddleware, AuthenticatedRequest } from "../middleware";

export function registerSupplierRoutes(app: Express) {
  app.get("/api/suppliers", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const suppliers = await storage.getSuppliers(req.user.companyId);
      res.json(suppliers.map(s => ({ ...s, totalPurchases: Number(s.totalPurchases || 0) })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
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
      const cleanData: any = {};
      for (const [key, value] of Object.entries(req.body)) {
        cleanData[key] = (value === '' || value === undefined) ? null : value;
      }
      const data = insertSupplierSchema.partial().parse(cleanData);
      const supplier = await storage.updateSupplier(req.user.companyId, req.params.id, data);
      if (!supplier) return res.status(404).json({ error: "Supplier not found" });
      res.json(supplier);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid supplier data" });
    }
  });

  app.delete("/api/suppliers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deleteSupplier(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to delete supplier" });
    }
  });
}
