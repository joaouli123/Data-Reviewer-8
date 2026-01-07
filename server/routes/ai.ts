import { Express } from "express";
<<<<<<< HEAD
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import { analyzeWithAI } from "../api/ai";
import { db } from "../db";
import { users } from "../../shared/schema";
=======
import { authMiddleware, AuthenticatedRequest } from "../middleware.js";
import { analyzeWithAI } from "../api/ai.js";
import { db } from "../db.js";
import { users } from "../../shared/schema.js";
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0
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

export function registerAIRoutes(app: Express) {
  app.post("/api/ai/analyze", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!await checkPermission(req, 'view_reports')) return res.status(403).json({ error: "Acesso negado" });
      const { prompt, schema } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required" });
      
      const result = await analyzeWithAI(prompt, schema);
      res.json({ result });
    } catch (error: any) {
      console.error("AI analysis error:", error);
      if (error.message === 'API_KEY_NOT_CONFIGURED') {
        return res.status(503).json({ error: "Serviço de IA não configurado no servidor." });
      }
      res.status(500).json({ error: "AI analysis failed" });
    }
  });
}
