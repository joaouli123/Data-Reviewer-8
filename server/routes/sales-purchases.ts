import { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { sales, transactions, cashFlow, purchases } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, AuthenticatedRequest } from "../middleware";

export function registerSalesPurchasesRoutes(app: Express) {
  app.get("/api/sales", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const salesData = await storage.getSales(req.user.companyId);
      // Ensure we only return sales associated with a customer
      res.json(salesData.filter(s => s.customerId));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.get("/api/purchases", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const purchasesData = await storage.getPurchases(req.user.companyId);
      // Ensure we only return purchases associated with a supplier
      res.json(purchasesData.filter(p => p.supplierId));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  app.post("/api/sales", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { customerId, saleDate, totalAmount, installmentCount, status, description, categoryId, paymentMethod, customInstallments } = req.body;

      // Create sale record
      const saleData = {
        companyId: req.user.companyId,
        customerId,
        date: new Date(saleDate),
        amount: String(totalAmount),
        installmentCount: parseInt(installmentCount) || 1,
        status: status || 'pago',
        paidAmount: status === 'pago' ? String(totalAmount) : '0',
        description: description || 'Venda sem descrição',
        categoryId,
        paymentMethod
      };

      console.log("[Sales Debug] Creating sale with data:", saleData);
      const sale = await storage.createSale(req.user.companyId, saleData as any);
      const installmentGroupId = `sale-${sale.id}-${Date.now()}`;

      // Register transaction
      if (customInstallments && customInstallments.length > 0) {
        for (let i = 0; i < customInstallments.length; i++) {
          const inst = customInstallments[i];
          const transactionData = {
            companyId: req.user.companyId,
            type: 'income',
            description: `${description || 'Venda'} (${i + 1}/${customInstallments.length})`,
            amount: String(inst.amount),
            date: new Date(inst.due_date),
            status: status === 'pago' ? 'pago' : 'pendente',
            categoryId,
            customerId,
            paymentMethod,
            installmentNumber: i + 1,
            installmentTotal: customInstallments.length,
            installmentGroup: installmentGroupId,
            shift: 'default'
          };
          console.log("[Sales Debug] Creating custom transaction:", transactionData);
          await storage.createTransaction(req.user.companyId, transactionData as any);
        }
      } else {
        const count = parseInt(installmentCount) || 1;
        const totalValue = parseFloat(totalAmount);
        const amountPerInstallment = Math.floor((totalValue / count) * 100) / 100;
        const lastInstallmentAmount = (totalValue - (amountPerInstallment * (count - 1))).toFixed(2);
        
        for (let i = 0; i < count; i++) {
          const dueDate = new Date(saleDate);
          // Ensure we don't modify the same date object
          const currentDueDate = new Date(dueDate);
          currentDueDate.setMonth(currentDueDate.getMonth() + i);
          
          const isLast = i === count - 1;
          const currentAmount = isLast ? lastInstallmentAmount : amountPerInstallment.toFixed(2);

          const transactionData = {
            companyId: req.user.companyId,
            type: 'income',
            description: count > 1 ? `${description || 'Venda'} (${i + 1}/${count})` : (description || 'Venda'),
            amount: String(currentAmount),
            date: currentDueDate,
            status: status === 'pago' ? 'pago' : 'pendente',
            categoryId,
            customerId,
            paymentMethod,
            installmentNumber: i + 1,
            installmentTotal: count,
            installmentGroup: installmentGroupId,
            shift: 'default'
          };
          console.log("[Sales Debug] Creating default transaction:", transactionData);
          await storage.createTransaction(req.user.companyId, transactionData as any);
        }
      }

      console.log("[Sales Debug] Sale and transactions created successfully");
      res.status(201).json(sale);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create sale" });
    }
  });

  app.post("/api/purchases", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { supplierId, purchaseDate, totalAmount, installmentCount, status, description, categoryId, paymentMethod, customInstallments } = req.body;

      // Create purchase record
      const purchaseData = {
        companyId: req.user.companyId,
        supplierId,
        date: new Date(purchaseDate),
        amount: String(totalAmount),
        installmentCount: parseInt(installmentCount) || 1,
        status: status || 'pago',
        paidAmount: status === 'pago' ? String(totalAmount) : '0',
        description: description || 'Compra sem descrição',
        categoryId,
        paymentMethod
      };

      console.log("[Purchases Debug] Attempting to create purchase:", purchaseData);
      const purchase = await storage.createPurchase(req.user.companyId, purchaseData as any);
      
      // Also create a transaction for the total amount to ensure it shows up in reports/supplier totals
      await storage.createTransaction(req.user.companyId, {
        type: 'compra',
        category: 'Compra',
        amount: String(totalAmount),
        date: new Date(purchaseDate),
        description: description || `Compra - ${purchase.id}`,
        status: 'pendente',
        supplierId: supplierId,
        companyId: req.user.companyId,
        shift: 'Normal' // Added missing required field
      } as any);

      const installmentGroupId = `purchase-${purchase.id}-${Date.now()}`;

      // Create transactions based on installments
      if (customInstallments && customInstallments.length > 0) {
        for (let i = 0; i < customInstallments.length; i++) {
          const inst = customInstallments[i];
          const transactionData = {
            companyId: req.user.companyId,
            type: 'expense',
            description: `${description || 'Compra'} (${i + 1}/${customInstallments.length})`,
            amount: String(inst.amount),
            date: new Date(inst.due_date),
            status: status === 'pago' ? 'pago' : 'pendente',
            categoryId,
            supplierId,
            paymentMethod,
            installmentNumber: i + 1,
            installmentTotal: customInstallments.length,
            installmentGroup: installmentGroupId,
            shift: 'default'
          };
          await storage.createTransaction(req.user.companyId, transactionData as any);
        }
      } else {
        const count = parseInt(installmentCount) || 1;
        const totalValue = parseFloat(totalAmount);
        const amountPerInstallment = Math.floor((totalValue / count) * 100) / 100;
        const lastInstallmentAmount = (totalValue - (amountPerInstallment * (count - 1))).toFixed(2);
        
        for (let i = 0; i < count; i++) {
          const dueDate = new Date(purchaseDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          
          const isLast = i === count - 1;
          const currentAmount = isLast ? lastInstallmentAmount : amountPerInstallment.toFixed(2);

          const transactionData = {
            companyId: req.user.companyId,
            type: 'expense',
            description: count > 1 ? `${description || 'Compra'} (${i + 1}/${count})` : (description || 'Compra'),
            amount: String(currentAmount),
            date: dueDate,
            status: status === 'pago' ? 'pago' : 'pendente',
            categoryId,
            supplierId,
            paymentMethod,
            installmentNumber: i + 1,
            installmentTotal: count,
            installmentGroup: installmentGroupId,
            shift: 'default'
          };
          await storage.createTransaction(req.user.companyId, transactionData as any);
        }
      }

      res.status(201).json(purchase);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create purchase" });
    }
  });
}
