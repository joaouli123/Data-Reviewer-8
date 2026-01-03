import { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import { insertCustomerSchema } from "../../shared/schema";

export function registerCustomerRoutes(app: Express) {
  app.get("/api/customers", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const customers = await storage.getCustomers(req.user.companyId);
      const converted = customers.map(c => ({
        ...c,
        totalSales: Number(c.totalSales || 0)
      }));
      res.json(converted);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const customer = await storage.getCustomer(req.user.companyId, req.params.id);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const cleanData: any = {};
      for (const [key, value] of Object.entries(req.body)) {
        cleanData[key] = (value === '' || value === undefined) ? null : value;
      }
      const data = insertCustomerSchema.parse(cleanData);
      const customer = await storage.createCustomer(req.user.companyId, data);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid customer data" });
    }
  });

  app.patch("/api/customers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const cleanData: any = {};
      for (const [key, value] of Object.entries(req.body)) {
        cleanData[key] = (value === '' || value === undefined) ? null : value;
      }
      const data = insertCustomerSchema.partial().parse(cleanData);
      const customer = await storage.updateCustomer(req.user.companyId, req.params.id, data);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid customer data" });
    }
  });

  app.get("/api/customers/:id/sales", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const transactions = await storage.getTransactions(req.user.companyId);
      const sales = (transactions || [])
        .filter(t => String(t.customerId || '') === String(req.params.id) && (t.type === 'venda' || t.type === 'income'))
        .map(t => ({
          ...t,
          amount: t.amount ? parseFloat(t.amount.toString()) : 0,
          paidAmount: t.paidAmount ? parseFloat(t.paidAmount.toString()) : null,
          interest: t.interest ? parseFloat(t.interest.toString()) : 0
        }));
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer sales" });
    }
  });

  app.delete("/api/customers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deleteCustomer(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to delete customer" });
    }
  });
}
