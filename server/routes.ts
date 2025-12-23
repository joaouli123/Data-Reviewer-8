import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authMiddleware, requireRole, requireSuperAdmin, subscriptionCheckMiddleware, checkRateLimit, recordLoginAttempt, AuthenticatedRequest } from "./middleware";
import {
  insertCustomerSchema,
  insertSupplierSchema,
  insertCategorySchema,
  insertTransactionSchema,
  insertCashFlowSchema,
  insertUserSchema,
  insertCompanySchema,
  insertSubscriptionSchema,
  DEFAULT_CATEGORIES,
} from "../shared/schema";
import {
  createCompany,
  createUser,
  findUserByUsername,
  verifyPassword,
  generateToken,
  createSession,
  findUserById,
  findCompanyById,
  createAuditLog,
} from "./auth";
import { setupVite } from "./vite";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Health check (public)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ========== AUTH ROUTES (PUBLIC) ==========

  // Sign up - create company and first user
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { companyName, companyDocument, username, email, password, name } = req.body;

      if (!companyName || !companyDocument || !username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Create company
      const company = await createCompany(companyName, companyDocument);

      // Create user (admin role for first user)
      const user = await createUser(company.id, username, email, password, name, "admin");

      // Generate token
      const token = generateToken({
        userId: user.id,
        companyId: company.id,
        role: user.role,
      });

      // Create session
      await createSession(user.id, company.id, token);

      res.status(201).json({
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
          companyId: company.id,
          permissions: {}
        },
        company: { id: company.id, name: company.name },
        token,
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Login with rate limiting
  app.post("/api/auth/login", async (req, res) => {
    try {
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown';
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Missing username or password" });
      }

      // Check rate limiting
      const rateLimitCheck = await checkRateLimit(ip);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ error: "Too many login attempts. Please try again later." });
      }

      // Find user
      const user = await findUserByUsername(username);
      if (!user) {
        await recordLoginAttempt(ip, username, false);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        await recordLoginAttempt(ip, username, false);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Get company
      const company = await findCompanyById(user.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Record successful login
      await recordLoginAttempt(ip, username, true);

      // Generate token
      const token = generateToken({
        userId: user.id,
        companyId: user.companyId,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
      });

      // Create session
      await createSession(user.id, user.companyId, token);

      // Audit log
      await createAuditLog(user.id, user.companyId, "LOGIN", "user", user.id, undefined, ip, req.headers['user-agent'] || 'unknown');

      res.json({
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role, 
          isSuperAdmin: user.isSuperAdmin,
          companyId: user.companyId,
          permissions: user.permissions ? JSON.parse(user.permissions) : {}
        },
        company: { id: company.id, name: company.name },
        token,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const user = await findUserById(req.user.id);
      const company = await findCompanyById(req.user.companyId);

      if (!user || !company) {
        return res.status(404).json({ error: "User or company not found" });
      }

      res.json({
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
          companyId: user.companyId,
          permissions: user.permissions ? JSON.parse(user.permissions) : {}
        },
        company: { id: company.id, name: company.name },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Logout
  app.post("/api/auth/logout", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      // Token invalidation would happen here if we implemented it in auth.ts
      res.json({ message: "Logged out" });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // ========== PROTECTED ROUTES (REQUIRE AUTH) ==========

  // Customer routes
  app.get("/api/customers", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const customers = await storage.getCustomers(req.user.companyId);
      res.json(customers);
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
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(req.user.companyId, data);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  app.patch("/api/customers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.user.companyId, req.params.id, data);
      res.json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  app.delete("/api/customers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deleteCustomer(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Supplier routes
  app.get("/api/suppliers", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const suppliers = await storage.getSuppliers(req.user.companyId);
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/suppliers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const supplier = await storage.getSupplier(req.user.companyId, req.params.id);
      if (!supplier) return res.status(404).json({ error: "Supplier not found" });
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier" });
    }
  });

  app.post("/api/suppliers", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(req.user.companyId, data);
      res.status(201).json(supplier);
    } catch (error) {
      res.status(400).json({ error: "Invalid supplier data" });
    }
  });

  app.patch("/api/suppliers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(req.user.companyId, req.params.id, data);
      res.json(supplier);
    } catch (error) {
      res.status(400).json({ error: "Invalid supplier data" });
    }
  });

  app.delete("/api/suppliers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deleteSupplier(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  // Category routes
  app.get("/api/categories", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      let categories = await storage.getCategories(req.user.companyId);

      if (categories.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          try {
            await storage.createCategory(req.user.companyId, cat);
          } catch (e) {
            // Category might already exist
          }
        }
        categories = await storage.getCategories(req.user.companyId);
      }

      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const name = String(req.body.name || "").trim();
      const type = String(req.body.type || "entrada");

      if (!name) return res.status(400).json({ error: "Category name is required" });

      const existing = await storage.getCategories(req.user.companyId);
      if (existing.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ error: "Category already exists" });
      }

      const category = await storage.createCategory(req.user.companyId, { name, type });
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(req.user.companyId, req.params.id, data);
      res.json(category);
    } catch (error) {
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  app.delete("/api/categories/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deleteCategory(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const transactions = await storage.getTransactions(req.user.companyId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const transaction = await storage.getTransaction(req.user.companyId, req.params.id);
      if (!transaction) return res.status(404).json({ error: "Transaction not found" });
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  app.post("/api/transactions", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const body = req.body;
      if (typeof body.date === "string") body.date = new Date(body.date);
      const data = insertTransactionSchema.parse(body);
      const transaction = await storage.createTransaction(req.user.companyId, data);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  app.patch("/api/transactions/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const body = req.body;
      if (typeof body.date === "string") body.date = new Date(body.date);
      if (typeof body.paymentDate === "string") body.paymentDate = new Date(body.paymentDate);
      const data = insertTransactionSchema.partial().parse(body);
      const transaction = await storage.updateTransaction(req.user.companyId, req.params.id, data);
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  app.delete("/api/transactions/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deleteTransaction(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  app.get("/api/transactions/by-shift/:shift", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const transactions = await storage.getTransactionsByShift(req.user.companyId, req.params.shift);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Cash Flow routes
  app.get("/api/cash-flow", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const cashFlows = await storage.getCashFlows(req.user.companyId);
      res.json(cashFlows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash flows" });
    }
  });

  app.get("/api/cash-flow/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const cashFlow = await storage.getCashFlow(req.user.companyId, req.params.id);
      if (!cashFlow) return res.status(404).json({ error: "Cash flow not found" });
      res.json(cashFlow);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash flow" });
    }
  });

  app.post("/api/cash-flow", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertCashFlowSchema.parse(req.body);
      const cashFlow = await storage.createCashFlow(req.user.companyId, data);
      res.status(201).json(cashFlow);
    } catch (error) {
      res.status(400).json({ error: "Invalid cash flow data" });
    }
  });

  app.patch("/api/cash-flow/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertCashFlowSchema.partial().parse(req.body);
      const cashFlow = await storage.updateCashFlow(req.user.companyId, req.params.id, data);
      res.json(cashFlow);
    } catch (error) {
      res.status(400).json({ error: "Invalid cash flow data" });
    }
  });

  app.delete("/api/cash-flow/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deleteCashFlow(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete cash flow" });
    }
  });

  app.get("/api/cash-flow/by-shift/:shift", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const cashFlows = await storage.getCashFlowsByShift(req.user.companyId, req.params.shift);
      res.json(cashFlows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash flows" });
    }
  });

  // Sales routes
  app.get("/api/sales", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const sales = await storage.getSales(req.user.companyId);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.get("/api/sales/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const sale = await storage.getSale(req.user.companyId, req.params.id);
      if (!sale) return res.status(404).json({ error: "Sale not found" });
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sale" });
    }
  });

  app.post("/api/sales", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const sale = await storage.createSale(req.user.companyId, req.body);
      res.status(201).json(sale);
    } catch (error) {
      res.status(400).json({ error: "Invalid sale data" });
    }
  });

  app.patch("/api/sales/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const sale = await storage.updateSale(req.user.companyId, req.params.id, req.body);
      res.json(sale);
    } catch (error) {
      res.status(400).json({ error: "Invalid sale data" });
    }
  });

  app.delete("/api/sales/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deleteSale(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete sale" });
    }
  });

  // Purchases routes
  app.get("/api/purchases", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const purchases = await storage.getPurchases(req.user.companyId);
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  app.get("/api/purchases/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const purchase = await storage.getPurchase(req.user.companyId, req.params.id);
      if (!purchase) return res.status(404).json({ error: "Purchase not found" });
      res.json(purchase);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase" });
    }
  });

  app.post("/api/purchases", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const purchase = await storage.createPurchase(req.user.companyId, req.body);
      res.status(201).json(purchase);
    } catch (error) {
      res.status(400).json({ error: "Invalid purchase data" });
    }
  });

  app.patch("/api/purchases/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const purchase = await storage.updatePurchase(req.user.companyId, req.params.id, req.body);
      res.json(purchase);
    } catch (error) {
      res.status(400).json({ error: "Invalid purchase data" });
    }
  });

  app.delete("/api/purchases/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deletePurchase(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete purchase" });
    }
  });

  // Installments routes
  app.get("/api/installments", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const installments = await storage.getInstallments(req.user.companyId);
      res.json(installments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch installments" });
    }
  });

  app.get("/api/installments/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const installment = await storage.getInstallment(req.user.companyId, req.params.id);
      if (!installment) return res.status(404).json({ error: "Installment not found" });
      res.json(installment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch installment" });
    }
  });

  app.post("/api/installments", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const installment = await storage.createInstallment(req.user.companyId, req.body);
      res.status(201).json(installment);
    } catch (error) {
      res.status(400).json({ error: "Invalid installment data" });
    }
  });

  app.patch("/api/installments/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const installment = await storage.updateInstallment(req.user.companyId, req.params.id, req.body);
      res.json(installment);
    } catch (error) {
      res.status(400).json({ error: "Invalid installment data" });
    }
  });

  app.delete("/api/installments/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deleteInstallment(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete installment" });
    }
  });

  // Purchase Installments routes
  app.get("/api/purchase-installments", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const installments = await storage.getPurchaseInstallments(req.user.companyId);
      res.json(installments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase installments" });
    }
  });

  app.get("/api/purchase-installments/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const installment = await storage.getPurchaseInstallment(req.user.companyId, req.params.id);
      if (!installment) return res.status(404).json({ error: "Purchase installment not found" });
      res.json(installment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase installment" });
    }
  });

  app.post("/api/purchase-installments", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const installment = await storage.createPurchaseInstallment(req.user.companyId, req.body);
      res.status(201).json(installment);
    } catch (error) {
      res.status(400).json({ error: "Invalid purchase installment data" });
    }
  });

  app.patch("/api/purchase-installments/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const installment = await storage.updatePurchaseInstallment(req.user.companyId, req.params.id, req.body);
      res.json(installment);
    } catch (error) {
      res.status(400).json({ error: "Invalid purchase installment data" });
    }
  });

  app.delete("/api/purchase-installments/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deletePurchaseInstallment(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete purchase installment" });
    }
  });

  // ========== SUPER ADMIN ROUTES (PROTECTED) ==========

  // Get all companies (Super Admin only)
  app.get("/api/super-admin/companies", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const companies = await storage.getCompanies();
      const companiesWithSubs = await Promise.all(
        companies.map(async (c) => ({
          ...c,
          subscription: await storage.getCompanySubscription(c.id),
        }))
      );
      res.json(companiesWithSubs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Block/unblock company subscription (Super Admin only)
  app.patch("/api/super-admin/companies/:id/subscription", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      
      if (!["active", "suspended", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid subscription status" });
      }

      const subscription = await storage.updateCompanySubscription(req.params.id, { status });
      
      // Audit log
      if (req.user) {
        await createAuditLog(
          req.user.id,
          req.user.companyId,
          `UPDATE_COMPANY_SUBSCRIPTION_${status.toUpperCase()}`,
          "company",
          req.params.id,
          JSON.stringify({ status }),
          req.ip || 'unknown',
          req.headers['user-agent'] || 'unknown'
        );
      }

      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  // Get audit logs (Super Admin only)
  app.get("/api/super-admin/audit-logs/:companyId", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const logs = await storage.getAuditLogs(req.params.companyId, 100);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Get current user with Super Admin flag
  app.get("/api/auth/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const user = await findUserById(req.user.id);
      const company = await findCompanyById(req.user.companyId);

      if (!user || !company) {
        return res.status(404).json({ error: "User or company not found" });
      }

      res.json({
        user: { id: user.id, username: user.username, email: user.email, role: user.role, isSuperAdmin: user.isSuperAdmin },
        company: { id: company.id, name: company.name },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // ========== PROTECTED ROUTES WITH SUBSCRIPTION CHECK ==========

  // Apply subscription check to all data routes
  const protectedRoutes = [
    "/api/customers",
    "/api/suppliers",
    "/api/categories",
    "/api/transactions",
    "/api/cashflow",
    "/api/sales",
    "/api/purchases",
    "/api/installments",
  ];

  // Logout
  app.post("/api/auth/logout", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user) {
        await createAuditLog(
          req.user.id,
          req.user.companyId,
          "LOGOUT",
          "user",
          req.user.id,
          undefined,
          req.ip || 'unknown',
          req.headers['user-agent'] || 'unknown'
        );
      }
      res.json({ message: "Logged out" });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // ========== USER MANAGEMENT ==========
  app.get("/api/users", authMiddleware, requireRole(["admin", "manager"]), async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getUsers(req.user.companyId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Create user directly (for admin to add users)
  app.post("/api/auth/create-user", authMiddleware, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const { username, email, password, name, role = "operational", permissions = {} } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Create user in same company
      const user = await createUser(req.user.companyId, username, email, password, name, role);

      // Add permissions if provided
      if (role !== "admin" && Object.keys(permissions).length > 0) {
        await storage.updateUserPermissions(req.user.companyId, user.id, permissions);
      }

      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: permissions
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.post("/api/invitations", authMiddleware, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const { email, role = "operational", permissions = {} } = req.body;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const invitation = await storage.createInvitation(req.user.companyId, req.user.id, { 
        email, 
        role, 
        expiresAt, 
        permissions: JSON.stringify(permissions)
      });
      res.json({ invitationId: invitation.id, token: invitation.token });
    } catch (error) {
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  app.delete("/api/users/:userId", authMiddleware, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      // Prevent admin from deleting themselves
      if (req.params.userId === req.user.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      await storage.deleteUser(req.user.companyId, req.params.userId);
      res.json({ message: "User deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.patch("/api/users/:userId/permissions", authMiddleware, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const { permissions } = req.body;
      const permsObj = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
      const updated = await storage.updateUserPermissions(req.user.companyId, req.params.userId, permsObj);
      res.json({ message: "Permissions updated", user: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to update permissions" });
    }
  });

  app.post("/api/invitations/accept", async (req, res) => {
    try {
      const { token, username, password } = req.body;
      const invitation = await storage.getInvitationByToken(token);
      
      if (!invitation) {
        return res.status(400).json({ error: "Invalid invitation" });
      }

      if (invitation.acceptedAt) {
        return res.status(400).json({ error: "Invitation already accepted" });
      }
      
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invitation expired" });
      }

      const newUser = await createUser(
        invitation.companyId, 
        username, 
        invitation.email, 
        password, 
        username, 
        invitation.role
      );
      
      // Save permissions from invitation
      if (invitation.permissions) {
        const perms = typeof invitation.permissions === 'string' 
          ? JSON.parse(invitation.permissions) 
          : invitation.permissions;
        await storage.updateUserPermissions(invitation.companyId, newUser.id, perms);
      }
      
      await storage.acceptInvitation(token, newUser.id);

      res.json({ user: { id: newUser.id, username: newUser.username, email: newUser.email } });
    } catch (error) {
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  // 404 fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  // Setup Vite dev server in development (MUST be last!)
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    await setupVite(httpServer, app);
  }

  return httpServer;
}
