import { Express } from "express";
<<<<<<< HEAD
import { storage } from "../storage";
import { insertCategorySchema, DEFAULT_CATEGORIES } from "../../shared/schema";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
=======
import { storage } from "../storage.js";
import { insertCategorySchema, DEFAULT_CATEGORIES } from "../../shared/schema.js";
import { authMiddleware, AuthenticatedRequest } from "../middleware.js";
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0
import { z } from "zod";

export function registerCategoryRoutes(app: Express) {

  // GET: Lista as categorias (cria padrões se não existirem)
  app.get("/api/categories", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      let categories = await storage.getCategories(req.user.companyId);

      // Auto-seed: Se não tiver nenhuma categoria, cria as padrões
      if (categories.length === 0) {
        // Usamos Promise.all para ser mais rápido
        await Promise.all(
          DEFAULT_CATEGORIES.map(cat => 
            storage.createCategory(req.user!.companyId, cat).catch(() => {}) // Ignora erro se já existir
          )
        );
        // Busca novamente após criar
        categories = await storage.getCategories(req.user.companyId);
      }

      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // POST: Cria nova categoria (Despesa ou Receita)
  app.post("/api/categories", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      // 1. Validação usando o Schema do Drizzle/Zod
      // Isso garante que 'type' seja válido e 'name' não seja vazio
      const parseResult = insertCategorySchema.safeParse({
        ...req.body,
        companyId: req.user.companyId // Injeta o ID da empresa para validar
      });

      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error });
      }

<<<<<<< HEAD
      const { name, type } = parseResult.data;
=======
      const data = parseResult.data as any;
      const name = String(data.name);
      const type = String(data.type);
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0

      // 2. Verifica se já existe uma categoria com esse nome E tipo para esta empresa
      const existingCategories = await storage.getCategories(req.user.companyId);
      const exists = existingCategories.find(
        c => c.name.toLowerCase() === name.toLowerCase() && c.type === type
      );

      if (exists) {
        return res.status(409).json({ error: "Categoria já existe." });
      }

      // 3. Cria a categoria
      const category = await storage.createCategory(req.user.companyId, { name, type });
      res.json(category);

    } catch (error) {
      console.error("Category creation error:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // DELETE: Remove uma categoria customizada
  app.delete("/api/categories/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const categoryId = req.params.id;

      // Opcional: Verificar se a categoria pertence à empresa antes de deletar
      // (Depende de como seu storage.deleteCategory está implementado)

      await storage.deleteCategory(req.user.companyId, categoryId);
      res.status(204).end(); // 204 No Content
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });
}