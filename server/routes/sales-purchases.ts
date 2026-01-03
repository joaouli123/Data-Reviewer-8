import { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import { insertSaleSchema, insertPurchaseSchema } from "../../shared/schema";

export function registerSalesPurchasesRoutes(app: Express) {
  app.get("/api/sales", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const sales = await storage.getSales(req.user.companyId);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.post("/api/sales", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertSaleSchema.parse(req.body);
      const sale = await storage.createSale(req.user.companyId, data);
      res.status(201).json(sale);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid sale data" });
    }
  });

  app.get("/api/purchases", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const purchases = await storage.getPurchases(req.user.companyId);
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  app.post("/api/purchases", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertPurchaseSchema.parse(req.body);
      const purchase = await storage.createPurchase(req.user.companyId, data);
      res.status(201).json(purchase);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid purchase data" });
    }
  });
}
