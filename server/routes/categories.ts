import { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import { insertCategorySchema, DEFAULT_CATEGORIES } from "../../shared/schema";

export function registerCategoryRoutes(app: Express) {
  app.get("/api/categories", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      let categoriesList = await storage.getCategories(req.user.companyId);

      if (categoriesList.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          try {
            await storage.createCategory(req.user.companyId, cat);
          } catch (e) {}
        }
        categoriesList = await storage.getCategories(req.user.companyId);
      }
      res.json(categoriesList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const name = String(req.body.name || "").trim();
      const type = String(req.body.type || "entrada");
      if (!name) return res.status(400).json({ error: "Category name is required" });
      const existing = await storage.getCategories(req.user.companyId);
      if (existing.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ error: "Category already exists" });
      }
      const category = await storage.createCategory(req.user.companyId, { name, type });
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(req.user.companyId, req.params.id, data);
      res.json(category);
    } catch (error) {
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  app.delete("/api/categories/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deleteCategory(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });
}
