import { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest, requirePermission } from "../middleware";

export function registerCashFlowRoutes(app: Express) {
  app.get("/api/cash-flow", authMiddleware, requirePermission("view_reports"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const cashFlow = await storage.getCashFlow(req.user.companyId);
      res.json(cashFlow);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash flow data" });
    }
  });
}
