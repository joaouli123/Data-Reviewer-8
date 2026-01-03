import { Express } from "express";
import { registerAuthRoutes } from "./auth";
import { registerCustomerRoutes } from "./customers";
import { registerSupplierRoutes } from "./suppliers";
import { registerCategoryRoutes } from "./categories";
import { registerTransactionRoutes } from "./transactions";
import { registerCashFlowRoutes } from "./cash-flow";
import { registerAdminRoutes } from "./admin";
import { registerSalesPurchasesRoutes } from "./sales-purchases";

export function registerAllRoutes(app: Express) {
  registerAuthRoutes(app);
  registerCustomerRoutes(app);
  registerSupplierRoutes(app);
  registerCategoryRoutes(app);
  registerTransactionRoutes(app);
  registerCashFlowRoutes(app);
  registerAdminRoutes(app);
  registerSalesPurchasesRoutes(app);
}
