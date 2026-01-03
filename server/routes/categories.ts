import { Express } from "express";
import { storage } from "../storage";
import { insertCategorySchema, DEFAULT_CATEGORIES } from "../../shared/schema";
import { authMiddleware, AuthenticatedRequest } from "../middleware";

export function registerCategoryRoutes(app: Express) {
  app.get("/api/categories", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      let categories = await storage.getCategories(req.user.companyId);
      if (categories.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          try { await storage.createCategory(req.user.companyId, cat); } catch (e) {}
        }
        categories = await storage.getCategories(req.user.companyId);
      }
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { name, type } = req.body;
      if (!name || !type) return res.status(400).json({ error: "Name and type are required" });
      
      const category = await storage.createCategory(req.user.companyId, { name, type });
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });
}
