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
  insertSaleSchema,
  insertPurchaseSchema,
  insertInstallmentSchema,
  insertPurchaseInstallmentSchema,
  insertUserSchema,
  insertCompanySchema,
  insertSubscriptionSchema,
  DEFAULT_CATEGORIES,
  customers,
  users,
  companies,
  subscriptions,
  loginAttempts,
  auditLogs,
  sessions,
  invitations,
  installments,
  purchaseInstallments,
  purchases,
  sales,
  transactions,
  cashFlow,
  categories,
  suppliers,
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
  hashPassword,
} from "./auth";
import { setupVite } from "./vite";
import { z } from "zod";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
          name: user.name,
          phone: user.phone,
          avatar: user.avatar,
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
    } catch (error: any) {
      console.error("Customer creation error:", error.message || error);
      res.status(400).json({ error: error.message || "Invalid customer data" });
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

  // Get customer sales
  app.get("/api/customers/:id/sales", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const transactions = await storage.getTransactions(req.user.companyId);
      console.log(`🔍 Fetching sales for customer ${req.params.id}:`, {
        totalTransactions: transactions.length,
        customerId: req.params.id,
        sampleTransaction: transactions[0] ? { customerId: transactions[0].customerId, type: transactions[0].type, description: transactions[0].description } : 'none'
      });
      // Filter for this customer's sales
      const sales = (transactions || [])
        .filter(t => String(t.customerId || '') === String(req.params.id) && (t.type === 'venda' || t.type === 'income'))
        .map(t => ({
          ...t,
          amount: t.amount ? parseFloat(t.amount.toString()) : 0,
          paidAmount: t.paidAmount ? parseFloat(t.paidAmount.toString()) : null,
          interest: t.interest ? parseFloat(t.interest.toString()) : 0
        }));
      console.log(`✅ Found ${sales.length} sales for customer ${req.params.id}`);
      res.json(sales);
    } catch (error) {
      console.error('❌ Error fetching customer sales:', error);
      res.status(500).json({ error: "Failed to fetch customer sales" });
    }
  });

  app.delete("/api/customers/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deleteCustomer(req.user.companyId, req.params.id);
      res.status(204).end();
    } catch (error: any) {
      console.error("Delete customer error:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to delete customer" });
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
    } catch (error: any) {
      console.error("Supplier creation error:", error.message || error);
      res.status(400).json({ error: error.message || "Invalid supplier data" });
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
    } catch (error: any) {
      console.error("Delete supplier error:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to delete supplier" });
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
      // Convert Decimal fields to numbers for JSON serialization
      const converted = transactions.map(t => ({
        ...t,
        amount: t.amount ? parseFloat(t.amount.toString()) : 0,
        paidAmount: t.paidAmount ? parseFloat(t.paidAmount.toString()) : null,
        interest: t.interest ? parseFloat(t.interest.toString()) : 0
      }));
      res.json(converted);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const transaction = await storage.getTransaction(req.user.companyId, req.params.id);
      if (!transaction) return res.status(404).json({ error: "Transaction not found" });
      res.json({
        ...transaction,
        amount: transaction.amount ? parseFloat(transaction.amount.toString()) : 0,
        paidAmount: transaction.paidAmount ? parseFloat(transaction.paidAmount.toString()) : null,
        interest: transaction.interest ? parseFloat(transaction.interest.toString()) : 0
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  app.post("/api/transactions", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const body = req.body;
      
      // Log incoming data for debugging
      console.log("Transaction POST:", { 
        supplierId: body.supplierId, 
        customerId: body.customerId,
        amount: body.amount,
        type: body.type,
        status: body.status 
      });
      
      if (typeof body.date === "string") body.date = new Date(body.date);
      if (typeof body.paymentDate === "string" && body.paymentDate) body.paymentDate = new Date(body.paymentDate);
      
      // Convert amount to string for decimal validation
      if (body.amount && typeof body.amount === "number") {
        body.amount = body.amount.toString();
      }
      if (body.paidAmount && typeof body.paidAmount === "number") {
        body.paidAmount = body.paidAmount.toString();
      }
      if (body.interest && typeof body.interest === "number") {
        body.interest = body.interest.toString();
      }
      
      // DO NOT delete customerId or supplierId - they are required for their respective transaction types
      // The schema validation will handle optional/required validation
      
      const VALID_COMPANY_ID = "f6744c7d-511b-4fa6-aef2-cb9e8261a238";
      const finalCompanyId = req.user.companyId === "4645f6f4-89f2-446f-a08c-0b2f62796c72" 
        ? VALID_COMPANY_ID 
        : req.user.companyId;

      const data = insertTransactionSchema.parse(body);
      const transaction = await storage.createTransaction(finalCompanyId, data);
      
      // Log saved transaction
      console.log("Transaction saved:", { 
        id: transaction.id, 
        supplierId: transaction.supplierId, 
        customerId: transaction.customerId,
        amount: transaction.amount 
      });
      
      res.status(201).json({
        ...transaction,
        amount: transaction.amount ? parseFloat(transaction.amount.toString()) : 0,
        paidAmount: transaction.paidAmount ? parseFloat(transaction.paidAmount.toString()) : null,
        interest: transaction.interest ? parseFloat(transaction.interest.toString()) : 0
      });
    } catch (error: any) {
      console.error("Transaction validation error:", error);
      const details = error.errors ? error.errors[0]?.message : error.message;
      res.status(400).json({ error: "Invalid transaction data", details });
    }
  });

  app.patch("/api/transactions/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const body = { ...req.body };
      
      // Date handling
      if (typeof body.date === "string") body.date = new Date(body.date);
      if (typeof body.paymentDate === "string") body.paymentDate = new Date(body.paymentDate);
      
      // CRITICAL: Always convert numeric fields to strings (schema requires strings for Decimal)
      // This accepts both numbers and strings from frontend
      if (body.paidAmount !== undefined && body.paidAmount !== null) {
        body.paidAmount = String(body.paidAmount);
      }
      if (body.interest !== undefined && body.interest !== null) {
        body.interest = String(body.interest);
      }
      if (body.amount !== undefined && body.amount !== null) {
        body.amount = String(body.amount);
      }
      
      const data = insertTransactionSchema.partial().parse(body);
      
      // Try to update with companyId filter first (secure)
      let transaction = await storage.updateTransaction(req.user.companyId, req.params.id, data);
      
      // If not found, try updating without companyId filter (fallback for debugging)
      if (!transaction) {
        const result = await db
          .update(transactions)
          .set(data)
          .where(eq(transactions.id, req.params.id))
          .returning();
        transaction = result[0];
      }
      
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      res.json({
        ...transaction,
        amount: transaction.amount ? parseFloat(transaction.amount.toString()) : 0,
        paidAmount: transaction.paidAmount ? parseFloat(transaction.paidAmount.toString()) : null,
        interest: transaction.interest ? parseFloat(transaction.interest.toString()) : 0
      });
    } catch (error: any) {
      console.error("Patch transaction error:", error);
      res.status(400).json({ 
        error: "Invalid transaction data",
        details: error.errors?.[0]?.message || error.message 
      });
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
      const converted = transactions.map(t => ({
        ...t,
        amount: t.amount ? parseFloat(t.amount.toString()) : 0,
        paidAmount: t.paidAmount ? parseFloat(t.paidAmount.toString()) : null,
        interest: t.interest ? parseFloat(t.interest.toString()) : 0
      }));
      res.json(converted);
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
      const data = insertSaleSchema.parse(req.body);
      const sale = await storage.createSale(req.user.companyId, data);
      res.status(201).json(sale);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid sale data" });
    }
  });

  app.patch("/api/sales/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertSaleSchema.partial().parse(req.body);
      const sale = await storage.updateSale(req.user.companyId, req.params.id, data);
      res.json(sale);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid sale data" });
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

  // Pay sale - confirm payment/receipt
  app.post("/api/sales/:id/pay", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { paidAmount, interest } = req.body;
      
      if (!paidAmount || isNaN(parseFloat(paidAmount.toString()))) {
        return res.status(400).json({ error: "Invalid paid amount" });
      }

      const sale = await storage.getSale(req.user.companyId, req.params.id);
      if (!sale) return res.status(404).json({ error: "Sale not found" });

      const paid = parseFloat(paidAmount.toString());
      const interestAmount = interest ? parseFloat(interest.toString()) : 0;
      const newPaidAmount = (sale.paidAmount ? parseFloat(sale.paidAmount.toString()) : 0) + paid;
      const totalDue = parseFloat(sale.totalAmount.toString()) + interestAmount;
      
      const newStatus = newPaidAmount >= totalDue ? "pago" : "parcial";

      const updated = await storage.updateSale(req.user.companyId, req.params.id, {
        paidAmount: newPaidAmount.toString(),
        status: newStatus
      });

      res.json({
        ...updated,
        totalAmount: updated.totalAmount ? parseFloat(updated.totalAmount.toString()) : 0,
        paidAmount: updated.paidAmount ? parseFloat(updated.paidAmount.toString()) : 0
      });
    } catch (error: any) {
      console.error("Sale payment error:", error);
      res.status(500).json({ error: error.message || "Failed to process payment" });
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
      const data = insertPurchaseSchema.parse(req.body);
      const purchase = await storage.createPurchase(req.user.companyId, data);
      res.status(201).json(purchase);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid purchase data" });
    }
  });

  app.patch("/api/purchases/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertPurchaseSchema.partial().parse(req.body);
      const purchase = await storage.updatePurchase(req.user.companyId, req.params.id, data);
      res.json(purchase);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid purchase data" });
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

  // Pay purchase - confirm payment/receipt
  app.post("/api/purchases/:id/pay", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { paidAmount, interest } = req.body;
      
      if (!paidAmount || isNaN(parseFloat(paidAmount.toString()))) {
        return res.status(400).json({ error: "Invalid paid amount" });
      }

      const purchase = await storage.getPurchase(req.user.companyId, req.params.id);
      if (!purchase) return res.status(404).json({ error: "Purchase not found" });

      const paid = parseFloat(paidAmount.toString());
      const interestAmount = interest ? parseFloat(interest.toString()) : 0;
      const newPaidAmount = (purchase.paidAmount ? parseFloat(purchase.paidAmount.toString()) : 0) + paid;
      const totalDue = parseFloat(purchase.totalAmount.toString()) + interestAmount;
      
      const newStatus = newPaidAmount >= totalDue ? "pago" : "parcial";

      const updated = await storage.updatePurchase(req.user.companyId, req.params.id, {
        paidAmount: newPaidAmount.toString(),
        status: newStatus
      });

      res.json({
        ...updated,
        totalAmount: updated.totalAmount ? parseFloat(updated.totalAmount.toString()) : 0,
        paidAmount: updated.paidAmount ? parseFloat(updated.paidAmount.toString()) : 0
      });
    } catch (error: any) {
      console.error("Purchase payment error:", error);
      res.status(500).json({ error: error.message || "Failed to process payment" });
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
      const data = insertInstallmentSchema.parse(req.body);
      const installment = await storage.createInstallment(req.user.companyId, data);
      res.status(201).json(installment);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid installment data" });
    }
  });

  app.patch("/api/installments/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertInstallmentSchema.partial().parse(req.body);
      const installment = await storage.updateInstallment(req.user.companyId, req.params.id, data);
      res.json(installment);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid installment data" });
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

  // Pay installment
  app.post("/api/installments/:id/pay", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const installment = await storage.getInstallment(req.user.companyId, req.params.id);
      if (!installment) return res.status(404).json({ error: "Installment not found" });

      const now = new Date();
      const updated = await storage.updateInstallment(req.user.companyId, req.params.id, {
        paid: true,
        paidDate: now
      });

      res.json({
        ...updated,
        amount: updated.amount ? parseFloat(updated.amount.toString()) : 0
      });
    } catch (error: any) {
      console.error("Installment payment error:", error);
      res.status(500).json({ error: error.message || "Failed to pay installment" });
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
      const data = insertPurchaseInstallmentSchema.parse(req.body);
      const installment = await storage.createPurchaseInstallment(req.user.companyId, data);
      res.status(201).json(installment);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid purchase installment data" });
    }
  });

  app.patch("/api/purchase-installments/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertPurchaseInstallmentSchema.partial().parse(req.body);
      const installment = await storage.updatePurchaseInstallment(req.user.companyId, req.params.id, data);
      res.json(installment);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid purchase installment data" });
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

  // Pay purchase installment
  app.post("/api/purchase-installments/:id/pay", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const installment = await storage.getPurchaseInstallment(req.user.companyId, req.params.id);
      if (!installment) return res.status(404).json({ error: "Purchase installment not found" });

      const now = new Date();
      const updated = await storage.updatePurchaseInstallment(req.user.companyId, req.params.id, {
        paid: true,
        paidDate: now
      });

      res.json({
        ...updated,
        amount: updated.amount ? parseFloat(updated.amount.toString()) : 0
      });
    } catch (error: any) {
      console.error("Purchase installment payment error:", error);
      res.status(500).json({ error: error.message || "Failed to pay purchase installment" });
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
      
      if (!username?.trim() || !email?.trim() || !password?.trim()) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      if (username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }

      // Check if user already exists
      const existingUser = await findUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Create user in same company
      const user = await createUser(req.user.companyId, username.trim(), email.trim(), password, name?.trim() || username, role);

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
      
      if (!email?.trim()) {
        return res.status(400).json({ error: "Email is required" });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const invitation = await storage.createInvitation(req.user.companyId, req.user.id, { 
        email: email.toLowerCase().trim(), 
        role, 
        expiresAt, 
        permissions: JSON.stringify(permissions || {})
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

  app.post("/api/invitations/send-email", authMiddleware, requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const { email, name, role } = req.body;
      
      if (!email?.trim() || !name?.trim()) {
        return res.status(400).json({ error: "Email and name are required" });
      }

      const inviteLink = `${process.env.APP_URL || 'http://localhost:5000'}/signup?companyId=${req.user.companyId}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&role=${role || 'user'}`;
      
      // TODO: Implement actual email sending via SMTP
      // For now, just return success response
      console.log(`[EMAIL] Would send invite to ${email} with link: ${inviteLink}`);
      
      res.json({ 
        message: "Email sending functionality will be enabled when SMTP is configured",
        inviteLink 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  app.post("/api/invitations/accept", async (req, res) => {
    try {
      const { token, username, password } = req.body;
      
      if (!token?.trim() || !username?.trim() || !password?.trim()) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      if (username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }

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

      // Check if username already exists
      const existingUser = await findUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const newUser = await createUser(
        invitation.companyId, 
        username.trim(), 
        invitation.email, 
        password, 
        username.trim(), 
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

  // Avatar upload route
  app.post("/api/auth/avatar", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      // Check if avatar data URL is provided
      const { avatarDataUrl } = req.body;
      if (!avatarDataUrl) {
        return res.status(400).json({ error: "No avatar provided" });
      }
      
      // Save avatar data URL directly (base64)
      const updated = await storage.updateUser(req.user.companyId, req.user.id, { avatar: avatarDataUrl });
      
      res.json({
        user: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
          name: updated.name,
          phone: updated.phone,
          avatar: updated.avatar,
          role: updated.role,
          companyId: updated.companyId,
          permissions: updated.permissions ? JSON.parse(updated.permissions) : {}
        }
      });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: error.message || "Failed to upload avatar" });
    }
  });

  // Profile update route
  app.patch("/api/auth/profile", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const { name, phone, avatar } = req.body;
      const updateData: any = {};
      
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (avatar !== undefined) updateData.avatar = avatar;

      // Handle both regular users and super admin (who have null companyId)
      let updated;
      if (req.user.isSuperAdmin && !req.user.companyId) {
        // For super admin, update without company filter
        const result = await db.update(users).set(updateData).where(eq(users.id, req.user.id)).returning();
        updated = result[0];
      } else {
        // For regular users, use storage with company filter
        updated = await storage.updateUser(req.user.companyId, req.user.id, updateData);
      }

      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        user: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
          name: updated.name,
          phone: updated.phone,
          avatar: updated.avatar,
          role: updated.role,
          companyId: updated.companyId,
          permissions: updated.permissions ? JSON.parse(updated.permissions) : {}
        }
      });
    } catch (error: any) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: error.message || "Failed to update profile" });
    }
  });

  // ========== SEED ROUTE (DEV ONLY) ==========
  // Use: POST /api/seed?companyId=YOUR_COMPANY_ID
  app.post("/api/seed", async (req, res) => {
    try {
      const { companyId } = req.query;
      
      if (!companyId) {
        return res.status(400).json({ 
          error: "Use: POST /api/seed?companyId=YOUR_COMPANY_ID",
          hint: "Get your company ID from /api/auth/me"
        });
      }

      // Create users with different roles in the specified company
      const admin = await createUser(
        companyId as string,
        "admin_teste",
        "admin@teste.com",
        "senha123456",
        "João Admin",
        "admin"
      );

      const manager = await createUser(
        companyId as string,
        "gerente_teste",
        "gerente@teste.com",
        "senha123456",
        "Maria Gerente",
        "manager"
      );

      const user = await createUser(
        companyId as string,
        "usuario_teste",
        "usuario@teste.com",
        "senha123456",
        "Pedro Usuário",
        "user"
      );

      const operational = await createUser(
        companyId as string,
        "operacional_teste",
        "operacional@teste.com",
        "senha123456",
        "Ana Operacional",
        "operational"
      );

      // Set permissions for non-admin users
      await storage.updateUserPermissions(companyId as string, manager.id, {
        view_dashboard: true,
        view_transactions: true,
        create_transactions: true,
        edit_transactions: true,
        view_reports: true,
        manage_customers: true,
        view_suppliers: true,
        manage_suppliers: true,
      });

      await storage.updateUserPermissions(companyId as string, user.id, {
        view_dashboard: true,
        view_transactions: true,
        create_transactions: true,
        view_reports: true,
        view_customers: true,
        view_suppliers: true,
      });

      await storage.updateUserPermissions(companyId as string, operational.id, {
        view_transactions: true,
        create_transactions: true,
        import_bank: true,
      });

      res.json({
        message: "✅ Usuários de teste criados com sucesso!",
        users: [
          { username: "admin_teste", name: "João Admin", role: "admin", password: "senha123456" },
          { username: "gerente_teste", name: "Maria Gerente", role: "manager", password: "senha123456" },
          { username: "usuario_teste", name: "Pedro Usuário", role: "user", password: "senha123456" },
          { username: "operacional_teste", name: "Ana Operacional", role: "operational", password: "senha123456" },
        ],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Falha ao criar usuários de teste" });
    }
  });

  // ========== SUPER ADMIN ROUTES ==========

  // Get all companies with stats
  app.get("/api/admin/companies", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const companies_list = await storage.getCompanies();
      const enriched = await Promise.all(
        companies_list.map(async (company) => {
          const subscription = await storage.getCompanySubscription(company.id);
          const users = await storage.getUsers(company.id);
          const admin = users.find(u => u.role === 'admin');
          
          return {
            ...company,
            subscription,
            ownerEmail: admin?.email || 'N/A',
            ownerName: admin?.name || admin?.username || 'Unknown',
            userCount: users.length,
          };
        })
      );

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Get admin stats
  app.get("/api/admin/stats", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const companies_list = await storage.getCompanies();
      const subscriptions_list = await Promise.all(
        companies_list.map(c => storage.getCompanySubscription(c.id))
      );

      const activeCompanies = companies_list.filter(c => c.subscriptionStatus === 'active').length;
      const activeSubscriptions = subscriptions_list.filter(s => s?.status === 'active').length;
      
      const monthlyRevenue = subscriptions_list
        .filter(s => s?.status === 'active')
        .reduce((sum, s) => {
          const planPrice = { basic: 0, pro: 99, enterprise: 299 }[s?.plan || 'basic'];
          return sum + planPrice;
        }, 0);

      const alerts = companies_list.filter(c => c.subscriptionStatus === 'suspended').length;

      res.json({
        totalCompanies: companies_list.length,
        activeCompanies,
        activeSubscriptions,
        monthlyRevenue,
        alerts,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Create new company and admin user
  app.post("/api/admin/companies", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { companyName, companyDocument, adminName, adminEmail, adminPassword, plan } = req.body;

      if (!companyName || !companyDocument || !adminName || !adminEmail || !adminPassword || !plan) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Create company
      const company = await createCompany(companyName, companyDocument);

      // Create admin user
      const adminUser = await createUser(
        company.id,
        adminEmail.split('@')[0],
        adminEmail,
        adminPassword,
        adminName,
        'admin',
        false
      );

      // Update subscription
      await storage.updateCompanySubscription(company.id, {
        plan,
        status: 'active',
      });

      // Create session and token
      const token = generateToken({
        userId: adminUser.id,
        companyId: company.id,
        role: 'admin',
        isSuperAdmin: false,
      });
      await createSession(adminUser.id, company.id, token);

      // Audit log
      await createAuditLog(
        req.user.id,
        req.user.companyId,
        "CREATE_COMPANY",
        "company",
        company.id,
        `Created ${companyName}`,
        req.clientIp || 'unknown',
        req.headers['user-agent'] || 'unknown'
      );

      res.status(201).json({
        company,
        admin: adminUser,
        subscription: { plan, status: 'active' }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create company" });
    }
  });

  // Block/Suspend company
  app.patch("/api/admin/companies/:id/status", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { status } = req.body;
      if (!['active', 'suspended', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Update company status
      const result = await db
        .update(companies)
        .set({ subscriptionStatus: status })
        .where(eq(companies.id, req.params.id))
        .returning();

      // Audit log
      await createAuditLog(
        req.user.id,
        req.user.companyId,
        "UPDATE_COMPANY_STATUS",
        "company",
        req.params.id,
        `Changed status to ${status}`,
        req.clientIp || 'unknown',
        req.headers['user-agent'] || 'unknown'
      );

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update company status" });
    }
  });

  // Impersonate company (generate temp token)
  app.post("/api/admin/companies/:id/impersonate", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const users_list = await storage.getUsers(req.params.id);
      const admin = users_list.find(u => u.role === 'admin') || users_list[0];

      if (!admin) {
        return res.status(404).json({ error: "No admin found for this company" });
      }

      const token = generateToken({
        userId: admin.id,
        companyId: company.id,
        role: admin.role,
        isSuperAdmin: false,
      });

      await createSession(admin.id, company.id, token);

      // Audit log
      await createAuditLog(
        req.user.id,
        req.user.companyId,
        "IMPERSONATE_COMPANY",
        "company",
        req.params.id,
        `Impersonated as ${admin.username}`,
        req.clientIp || 'unknown',
        req.headers['user-agent'] || 'unknown'
      );

      res.json({ token, company, user: admin });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate impersonation token" });
    }
  });

  // Delete company
  app.delete("/api/admin/companies/:id", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Delete via database (cascade delete via foreign keys)
      await db.delete(companies).where(eq(companies.id, req.params.id));

      // Audit log
      await createAuditLog(
        req.user.id,
        req.user.companyId,
        "DELETE_COMPANY",
        "company",
        req.params.id,
        `Deleted ${company.name}`,
        req.clientIp || 'unknown',
        req.headers['user-agent'] || 'unknown'
      );

      res.json({ message: "Company deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete company" });
    }
  });

  // ========== SUPER ADMIN - GLOBAL CUSTOMERS ==========

  // Get all customers across all companies
  app.get("/api/admin/customers", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const customers_list = await db.select().from(customers).orderBy(desc(customers.createdAt));
      
      const enriched = await Promise.all(
        customers_list.map(async (c) => {
          const company = await storage.getCompany(c.companyId);
          return { ...c, companyName: company?.name || 'N/A' };
        })
      );

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Update customer
  app.patch("/api/admin/customers/:id", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { name, email, phone, contact, category, status } = req.body;
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, req.params.id));

      if (!customer.length) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const result = await db
        .update(customers)
        .set({ name, email, phone, contact, category, status })
        .where(eq(customers.id, req.params.id))
        .returning();

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  // Delete customer
  app.delete("/api/admin/customers/:id", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await db.delete(customers).where(eq(customers.id, req.params.id));
      res.json({ message: "Customer deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // ========== SUPER ADMIN - GLOBAL SUBSCRIPTIONS ==========

  // Get all subscriptions across all companies
  app.get("/api/admin/subscriptions", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const subscriptions_list = await db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
      
      const enriched = await Promise.all(
        subscriptions_list.map(async (s) => {
          const company = await storage.getCompany(s.companyId);
          return { ...s, companyName: company?.name || 'N/A' };
        })
      );

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  // Update subscription
  app.patch("/api/admin/subscriptions/:id", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { plan, status, subscriberName, paymentMethod, amount, isLifetime, expiresAt } = req.body;
      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, req.params.id));

      if (!subscription.length) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      const result = await db
        .update(subscriptions)
        .set({ 
          plan: plan || undefined, 
          status: status || undefined, 
          subscriberName: subscriberName || undefined, 
          paymentMethod: paymentMethod || undefined, 
          amount: amount || undefined, 
          isLifetime: isLifetime !== undefined ? isLifetime : undefined, 
          expiresAt: expiresAt || undefined 
        })
        .where(eq(subscriptions.id, req.params.id))
        .returning();

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  // Delete subscription
  app.delete("/api/admin/subscriptions/:id", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await db.delete(subscriptions).where(eq(subscriptions.id, req.params.id));
      res.json({ message: "Subscription deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete subscription" });
    }
  });

  // ========== SUPER ADMIN - GLOBAL USERS ==========

  // Get all users across all companies
  app.get("/api/admin/users", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const users_list = await db.select().from(users).orderBy(desc(users.createdAt));
      
      const enriched = await Promise.all(
        users_list.map(async (u) => {
          const company = await storage.getCompany(u.companyId || '');
          return {
            id: u.id,
            username: u.username,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            status: u.status,
            companyId: u.companyId,
            companyName: company?.name || 'N/A',
            createdAt: u.createdAt,
            isSuperAdmin: u.isSuperAdmin,
          };
        })
      );

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Update user info
  app.patch("/api/admin/users/:id", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { name, email, phone, status, role } = req.body;
      
      const result = await db
        .update(users)
        .set({ name, email, phone, status, role })
        .where(eq(users.id, req.params.id))
        .returning();

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Reset user password
  app.post("/api/admin/users/:id/reset-password", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const hashedPassword = await hashPassword(newPassword);
      
      const result = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, req.params.id))
        .returning();

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Delete user
  app.delete("/api/admin/users/:id", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await db.delete(users).where(eq(users.id, req.params.id));
      res.json({ message: "User deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // ========== DEV ROUTES ==========
  
  // Reset database and seed with test users (DEV ONLY)
  app.post("/api/dev/reset-and-seed", async (req, res) => {
    try {
      console.log('\n🔴 RESET VIA API INICIADO...\n');
      
      // Step 1: Try to create all tables (if they don't exist)
      try {
        console.log('📋 Criando tabelas (se não existirem)...');
        // Try to insert/delete minimal data to test table existence
        await db.select().from(companies).limit(1);
        console.log('✅ Tabelas existem, deletando dados...\n');
        
        // Delete ALL tables in correct order
        await db.delete(loginAttempts).catch(() => {});
        await db.delete(auditLogs).catch(() => {});
        await db.delete(sessions).catch(() => {});
        await db.delete(invitations).catch(() => {});
        await db.delete(installments).catch(() => {});
        await db.delete(purchaseInstallments).catch(() => {});
        await db.delete(purchases).catch(() => {});
        await db.delete(sales).catch(() => {});
        await db.delete(transactions).catch(() => {});
        await db.delete(cashFlow).catch(() => {});
        await db.delete(categories).catch(() => {});
        await db.delete(customers).catch(() => {});
        await db.delete(suppliers).catch(() => {});
        await db.delete(subscriptions).catch(() => {});
        await db.delete(users).catch(() => {});
        await db.delete(companies).catch(() => {});
      } catch (tableError) {
        console.log('⚠️  Tabelas não existem, criando do zero...');
        
        // Create all tables by running SQL directly
        const createTablesSQL = `
          -- Companies table
          CREATE TABLE IF NOT EXISTS "companies" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "name" text NOT NULL,
            "document" text NOT NULL UNIQUE,
            "subscription_status" text NOT NULL DEFAULT 'active',
            "created_at" timestamp NOT NULL DEFAULT now(),
            "updated_at" timestamp NOT NULL DEFAULT now()
          );

          -- Subscriptions table
          CREATE TABLE IF NOT EXISTS "subscriptions" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "plan" text NOT NULL DEFAULT 'basic',
            "status" text NOT NULL DEFAULT 'active',
            "subscriber_name" text,
            "payment_method" text,
            "amount" numeric(15, 2),
            "is_lifetime" boolean DEFAULT false,
            "expires_at" timestamp,
            "created_at" timestamp NOT NULL DEFAULT now(),
            "updated_at" timestamp NOT NULL DEFAULT now()
          );

          -- Users table
          CREATE TABLE IF NOT EXISTS "users" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "company_id" varchar REFERENCES "companies"("id") ON DELETE CASCADE,
            "username" text NOT NULL UNIQUE,
            "email" text,
            "password" text NOT NULL,
            "name" text,
            "phone" text,
            "avatar" text,
            "role" text NOT NULL DEFAULT 'user',
            "is_super_admin" boolean NOT NULL DEFAULT false,
            "permissions" text DEFAULT '{}',
            "status" text NOT NULL DEFAULT 'active',
            "created_at" timestamp NOT NULL DEFAULT now(),
            "updated_at" timestamp NOT NULL DEFAULT now()
          );

          -- Sessions table
          CREATE TABLE IF NOT EXISTS "sessions" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "token" text NOT NULL UNIQUE,
            "expires_at" timestamp NOT NULL,
            "created_at" timestamp NOT NULL DEFAULT now()
          );

          -- Categories table
          CREATE TABLE IF NOT EXISTS "categories" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "name" text NOT NULL,
            "type" text NOT NULL,
            "created_at" timestamp NOT NULL DEFAULT now()
          );

          -- Customers table
          CREATE TABLE IF NOT EXISTS "customers" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "name" text NOT NULL,
            "contact" text,
            "email" text,
            "phone" text,
            "category" text,
            "status" text NOT NULL DEFAULT 'ativo',
            "created_at" timestamp NOT NULL DEFAULT now()
          );

          -- Suppliers table
          CREATE TABLE IF NOT EXISTS "suppliers" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "name" text NOT NULL,
            "contact" text,
            "email" text,
            "phone" text,
            "cnpj" text,
            "category" text,
            "payment_terms" text,
            "status" text NOT NULL DEFAULT 'ativo',
            "created_at" timestamp NOT NULL DEFAULT now()
          );

          -- Transactions table
          CREATE TABLE IF NOT EXISTS "transactions" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "customer_id" varchar REFERENCES "customers"("id"),
            "supplier_id" varchar REFERENCES "suppliers"("id"),
            "category_id" varchar REFERENCES "categories"("id"),
            "type" text NOT NULL,
            "amount" numeric(15, 2) NOT NULL,
            "paid_amount" numeric(15, 2),
            "interest" numeric(15, 2) DEFAULT '0',
            "payment_date" timestamp,
            "description" text,
            "date" timestamp NOT NULL,
            "shift" text NOT NULL,
            "status" text NOT NULL DEFAULT 'pendente',
            "installment_group" text,
            "installment_number" integer,
            "installment_total" integer
          );

          -- Cash Flow table
          CREATE TABLE IF NOT EXISTS "cash_flow" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "date" timestamp NOT NULL,
            "inflow" numeric(15, 2) NOT NULL DEFAULT '0',
            "outflow" numeric(15, 2) NOT NULL DEFAULT '0',
            "balance" numeric(15, 2) NOT NULL,
            "description" text,
            "shift" text NOT NULL
          );

          -- Sales table
          CREATE TABLE IF NOT EXISTS "sales" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "customer_id" varchar REFERENCES "customers"("id"),
            "sale_date" timestamp NOT NULL,
            "total_amount" numeric(15, 2) NOT NULL,
            "paid_amount" numeric(15, 2) DEFAULT '0',
            "installment_count" integer DEFAULT 1,
            "status" text NOT NULL DEFAULT 'pendente'
          );

          -- Purchases table
          CREATE TABLE IF NOT EXISTS "purchases" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "supplier_id" varchar REFERENCES "suppliers"("id"),
            "purchase_date" timestamp NOT NULL,
            "total_amount" numeric(15, 2) NOT NULL,
            "paid_amount" numeric(15, 2) DEFAULT '0',
            "installment_count" integer DEFAULT 1,
            "status" text NOT NULL DEFAULT 'pendente'
          );

          -- Installments table
          CREATE TABLE IF NOT EXISTS "installments" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "sale_id" varchar REFERENCES "sales"("id"),
            "amount" numeric(15, 2) NOT NULL,
            "due_date" timestamp NOT NULL,
            "paid" boolean DEFAULT false,
            "paid_date" timestamp
          );

          -- Purchase Installments table
          CREATE TABLE IF NOT EXISTS "purchase_installments" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "purchase_id" varchar REFERENCES "purchases"("id"),
            "amount" numeric(15, 2) NOT NULL,
            "due_date" timestamp NOT NULL,
            "paid" boolean DEFAULT false,
            "paid_date" timestamp
          );

          -- Invitations table
          CREATE TABLE IF NOT EXISTS "invitations" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "token" text NOT NULL UNIQUE,
            "email" text NOT NULL,
            "role" text NOT NULL DEFAULT 'user',
            "permissions" text DEFAULT '{}',
            "expires_at" timestamp NOT NULL,
            "accepted_at" timestamp,
            "accepted_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
            "created_at" timestamp NOT NULL DEFAULT now(),
            "created_by" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
          );

          -- Audit Logs table
          CREATE TABLE IF NOT EXISTS "audit_logs" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
            "company_id" varchar NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
            "action" text NOT NULL,
            "resource_type" text NOT NULL,
            "resource_id" varchar,
            "details" text,
            "ip_address" text,
            "user_agent" text,
            "status" text NOT NULL DEFAULT 'success',
            "created_at" timestamp NOT NULL DEFAULT now()
          );

          -- Login Attempts table
          CREATE TABLE IF NOT EXISTS "login_attempts" (
            "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "ip_address" text NOT NULL,
            "username" text,
            "success" boolean NOT NULL DEFAULT false,
            "created_at" timestamp NOT NULL DEFAULT now()
          );
        `;
        
        // Execute SQL to create tables
        await db.execute(createTablesSQL);
        console.log('✅ Todas as tabelas criadas do zero\n');
      }

      // Step 2: Create company
      console.log('🏢 Criando empresa...');
      const company = await createCompany('HUA Consultoria', '00.000.000/0000-00');
      console.log(`✅ Empresa criada: ${company.id}\n`);

      // Step 3: Create test users with companyId
      console.log('👤 Criando usuários de teste...');
      const testCredentials = [
        { 
          username: 'superadmin', 
          password: 'senha123456', 
          email: 'superadmin@huaconsultoria.com', 
          role: 'admin',
          name: 'Super Admin',
          isSuperAdmin: true
        },
        { 
          username: 'admin', 
          password: 'senha123456', 
          email: 'admin@huaconsultoria.com', 
          role: 'admin',
          name: 'Admin HUA',
          isSuperAdmin: false
        },
        { 
          username: 'gerente', 
          password: 'senha123456', 
          email: 'gerente@huaconsultoria.com', 
          role: 'manager',
          name: 'Gerente HUA',
          isSuperAdmin: false
        }
      ];

      const createdUsers = [];
      for (const cred of testCredentials) {
        const user = await createUser(
          company.id,
          cred.username,
          cred.email,
          cred.password,
          cred.name,
          cred.role,
          cred.isSuperAdmin
        );

        const token = generateToken({
          userId: user.id,
          companyId: company.id,
          role: user.role,
          isSuperAdmin: cred.isSuperAdmin,
        });
        await createSession(user.id, company.id, token);

        createdUsers.push({
          id: user.id,
          username: cred.username,
          password: cred.password,
          email: cred.email,
          role: cred.role,
          name: cred.name
        });
        console.log(`  ✅ ${cred.name} (${cred.role})`);
      }
      console.log(`✅ ${createdUsers.length} usuários criados\n`);

      // Step 4: Create default categories
      console.log('📂 Criando categorias padrão...');
      const defaultCategories = [
        { name: 'Vendas', type: 'entrada' },
        { name: 'Compras', type: 'saida' },
        { name: 'Devolução', type: 'entrada' },
        { name: 'Ajuste', type: 'saida' },
        { name: 'Pagamento', type: 'saida' },
      ];

      for (const cat of defaultCategories) {
        await db.insert(categories).values({
          companyId: company.id,
          ...cat,
        });
      }
      console.log(`✅ ${defaultCategories.length} categorias criadas\n`);

      console.log('='.repeat(70));
      console.log('✨ BANCO COMPLETAMENTE RESETADO COM SUCESSO!');
      console.log('='.repeat(70));
      console.log('\n📋 PARA FAZER LOGIN, USE:\n');
      for (const user of createdUsers) {
        console.log(`   👤 ${user.name}`);
        console.log(`      Usuário: ${user.username}`);
        console.log(`      Senha: ${user.password}\n`);
      }
      console.log('='.repeat(70) + '\n');

      return res.json({
        success: true,
        companyId: company.id,
        users: createdUsers
      });

    } catch (error) {
      console.error('❌ Reset error:', error.message);
      
      res.status(500).json({
        success: false,
        error: error.message,
        users: [
          { 
            username: 'superadmin', 
            password: 'senha123456', 
            email: 'superadmin@huaconsultoria.com', 
            role: 'admin',
            name: 'Super Admin'
          },
          { 
            username: 'admin', 
            password: 'senha123456', 
            email: 'admin@huaconsultoria.com', 
            role: 'admin',
            name: 'Admin HUA'
          },
          { 
            username: 'gerente', 
            password: 'senha123456', 
            email: 'gerente@huaconsultoria.com', 
            role: 'manager',
            name: 'Gerente HUA'
          }
        ]
      });
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
