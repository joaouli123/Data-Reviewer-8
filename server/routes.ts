import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCustomerSchema,
  insertSupplierSchema,
  insertTransactionSchema,
  insertCashFlowSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  console.log("[registerRoutes] Registering API routes...");

  // Test route to verify API works
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Customer routes
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  // Supplier routes
  app.get("/api/suppliers", async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const supplier = await storage.getSupplier(req.params.id);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier" });
    }
  });

  app.post("/api/suppliers", async (req, res) => {
    try {
      const data = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(data);
      res.status(201).json(supplier);
    } catch (error) {
      res.status(400).json({ error: "Invalid supplier data" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const data = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  app.get("/api/transactions/by-shift/:shift", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByShift(
        req.params.shift
      );
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Cash Flow routes
  app.get("/api/cash-flow", async (req, res) => {
    try {
      const cashFlows = await storage.getCashFlows();
      res.json(cashFlows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash flows" });
    }
  });

  app.get("/api/cash-flow/:id", async (req, res) => {
    try {
      const cashFlow = await storage.getCashFlow(req.params.id);
      if (!cashFlow) {
        return res.status(404).json({ error: "Cash flow not found" });
      }
      res.json(cashFlow);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash flow" });
    }
  });

  app.post("/api/cash-flow", async (req, res) => {
    try {
      const data = insertCashFlowSchema.parse(req.body);
      const cashFlow = await storage.createCashFlow(data);
      res.status(201).json(cashFlow);
    } catch (error) {
      res.status(400).json({ error: "Invalid cash flow data" });
    }
  });

  app.get("/api/cash-flow/by-shift/:shift", async (req, res) => {
    try {
      const cashFlows = await storage.getCashFlowsByShift(req.params.shift);
      res.json(cashFlows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash flows" });
    }
  });

  // Fallback for 404 API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  return httpServer;
}
