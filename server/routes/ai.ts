import { Express } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import { analyzeWithAI } from "../api/ai";

export function registerAIRoutes(app: Express) {
  app.post("/api/ai/analyze", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
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
