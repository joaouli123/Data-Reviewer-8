import { Express } from "express";
<<<<<<< HEAD
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
=======
import { storage } from "../storage.js";
import { authMiddleware, AuthenticatedRequest } from "../middleware.js";
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0

export function registerCashFlowRoutes(app: Express) {
  app.get("/api/cash-flow", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const cashFlow = await storage.getCashFlow(req.user.companyId);
      res.json(cashFlow);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash flow data" });
    }
  });
}
