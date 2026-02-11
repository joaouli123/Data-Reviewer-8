import { Express } from "express";
import { authMiddleware, AuthenticatedRequest, createSimpleRateLimiter } from "../middleware";
import { analyzeWithAI } from "../api/ai";
import { db } from "../db";
import { users } from "../../shared/schema";
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

// Sanitize user prompts to prevent prompt injection attacks
function sanitizePrompt(prompt: string): string {
  if (!prompt || typeof prompt !== 'string') return '';
  
  // Limit prompt length to prevent abuse
  const MAX_PROMPT_LENGTH = 10_000;
  let sanitized = prompt.slice(0, MAX_PROMPT_LENGTH);
  
  // Remove common prompt injection patterns
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/gi,
    /ignore\s+(all\s+)?above/gi,
    /disregard\s+(all\s+)?previous/gi,
    /forget\s+(all\s+)?previous/gi,
    /you\s+are\s+now/gi,
    /new\s+instructions?:/gi,
    /system\s*prompt/gi,
    /\[INST\]/gi,
    /\[\/?SYS(TEM)?\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
  ];
  
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }
  
  return sanitized;
}

export function registerAIRoutes(app: Express) {
  // Rate limit: max 10 AI requests per minute per user
  const aiRateLimiter = createSimpleRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: "ai" });

  app.post("/api/ai/analyze", authMiddleware, aiRateLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      if (!await checkPermission(req, 'view_reports')) return res.status(403).json({ error: "Acesso negado" });
      const { prompt, schema } = req.body;
      if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: "Prompt is required" });
      
      // Sanitize user input before sending to AI
      const sanitizedPrompt = sanitizePrompt(prompt);
      if (!sanitizedPrompt.trim()) return res.status(400).json({ error: "Invalid prompt" });
      
      // Validate schema if provided (only allow known keys)
      let validatedSchema = null;
      if (schema && typeof schema === 'object') {
        validatedSchema = schema;
      }
      
      const result = await analyzeWithAI(sanitizedPrompt, validatedSchema);
      res.json({ result });
    } catch (error: any) {
      console.error("AI analysis error:", error?.message);
      if (error.message === 'API_KEY_NOT_CONFIGURED') {
        return res.status(503).json({ error: "Serviço de IA não configurado no servidor." });
      }
      res.status(500).json({ error: "AI analysis failed" });
    }
  });
}
