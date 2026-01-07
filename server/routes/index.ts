import { Express } from "express";
import { registerAuthRoutes } from "./auth";
import { registerCustomerRoutes } from "./customers";
import { registerTransactionRoutes } from "./transactions";
import { registerSupplierRoutes } from "./suppliers";
import { registerCategoryRoutes } from "./categories";
import { registerSalesPurchasesRoutes } from "./sales-purchases";
import { registerAIRoutes } from "./ai";
import { registerBankRoutes } from "./bank";
import { registerCashFlowRoutes } from "./cash-flow";
import { registerAdminRoutes } from "./admin";

export function registerAllRoutes(app: Express) {
  registerAuthRoutes(app);
  registerCustomerRoutes(app);
  registerTransactionRoutes(app);
  registerSupplierRoutes(app);
  registerCategoryRoutes(app);
  registerSalesPurchasesRoutes(app);
  registerAIRoutes(app);
  registerBankRoutes(app);
  registerCashFlowRoutes(app);
  registerAdminRoutes(app);
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Fallback para rotas de API não encontradas para evitar retornar HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });
}
