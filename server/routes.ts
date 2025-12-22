import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCustomerSchema,
  insertSupplierSchema,
  insertCategorySchema,
  insertTransactionSchema,
  insertCashFlowSchema,
  DEFAULT_CATEGORIES,
} from "../shared/schema";
import { z } from "zod";

export function registerRoutes(
  httpServer: Server,
  app: Express
): Server {

  // Test route to verify API works
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Initialize with sample data
  app.post("/api/init", async (req, res) => {
    try {
      // Get or create categories
      let categories = await storage.getCategories();
      if (categories.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          try {
            await storage.createCategory(cat);
          } catch (e) {
            // Category might already exist
          }
        }
        categories = await storage.getCategories();
      }

      // Add sample transactions if none exist
      const existingTransactions = await storage.getTransactions();
      if (existingTransactions.length === 0) {
        const vendasCat = categories.find(c => c.name === "Vendas");
        const comprasCat = categories.find(c => c.name === "Compras");
        
        if (vendasCat && comprasCat) {
          const now = new Date();
          // Add some sample transactions
          const samples = [
            {
              categoryId: vendasCat.id,
              type: "venda",
              amount: "1500.00",
              description: "Venda de Produtos",
              date: now,
              shift: "manhã",
              status: "concluído"
            },
            {
              categoryId: comprasCat.id,
              type: "compra",
              amount: "800.00",
              description: "Compra de Insumos",
              date: now,
              shift: "tarde",
              status: "concluído"
            },
            {
              categoryId: vendasCat.id,
              type: "venda",
              amount: "2200.00",
              description: "Venda de Serviços",
              date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
              shift: "manhã",
              status: "concluído"
            },
            {
              categoryId: comprasCat.id,
              type: "compra",
              amount: "500.00",
              description: "Pagamento de Fornecedor",
              date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
              shift: "noite",
              status: "concluído"
            }
          ];

          for (const sample of samples) {
            await storage.createTransaction(sample);
          }
        }
      }

      res.json({ status: "initialized", timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("[/api/init] Error:", error);
      res.status(500).json({ error: "Failed to initialize" });
    }
  });

  // Customer routes
  app.get("/api/customers", async (req, res) => {
    try {
      const allCustomers = await storage.getCustomers();
      res.json(allCustomers);
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers", details: error.message });
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

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const data = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, data);
      res.json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      const existingCategories = await storage.getCategories();
      
      // If no categories exist, create default ones
      if (existingCategories.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          try {
            await storage.createCategory(cat);
          } catch (e) {
            // Category might already exist, continue
          }
        }
        const categories = await storage.getCategories();
        return res.json(categories);
      }
      
      res.json(existingCategories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      console.log("[POST /api/categories] Payload:", req.body);
      
      const name = String(req.body.name || '').trim();
      const type = String(req.body.type || 'entrada');
      
      if (!name) {
        return res.status(400).json({ error: "Nome da categoria é obrigatório" });
      }

      // Final simplified version with fixed error handling
      const existing = await storage.getCategories();
      if (existing.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ error: "Já existe uma categoria com este nome" });
      }

      const category = await storage.createCategory({ name, type });
      console.log("[POST /api/categories] Success:", category);
      res.status(201).json(category);
    } catch (error: any) {
      console.error("[POST /api/categories] Error:", error);
      res.status(500).json({ 
        error: "Erro ao processar categoria", 
        details: error.message || "Erro desconhecido"
      });
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    try {
      const data = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(req.params.id, data);
      res.json(category);
    } catch (error) {
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Supplier routes
  app.get("/api/suppliers", async (req, res) => {
    try {
      const allSuppliers = await storage.getSuppliers();
      res.json(allSuppliers);
    } catch (error: any) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers", details: error.message });
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

  app.patch("/api/suppliers/:id", async (req, res) => {
    try {
      const data = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(req.params.id, data);
      res.json(supplier);
    } catch (error) {
      res.status(400).json({ error: "Invalid supplier data" });
    }
  });

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      await storage.deleteSupplier(req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete supplier" });
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
      // Pre-process date: convert string to Date if needed
      const body = req.body;
      if (typeof body.date === 'string') {
        body.date = new Date(body.date);
      }
      const data = insertTransactionSchema.parse(body);
      const transaction = await storage.createTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("[POST /api/transactions] Validation error:", error);
      res.status(400).json({ error: "Invalid transaction data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const body = req.body;
      if (typeof body.date === 'string') {
        body.date = new Date(body.date);
      }
      const data = insertTransactionSchema.partial().parse(body);
      const transaction = await storage.updateTransaction(req.params.id, data);
      res.json(transaction);
    } catch (error) {
      console.error("[PATCH /api/transactions/:id] Error:", error);
      res.status(400).json({ error: "Invalid transaction data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      await storage.deleteTransaction(req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
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
