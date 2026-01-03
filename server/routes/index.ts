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
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
}
