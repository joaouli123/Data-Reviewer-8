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

      const saleData = {
        companyId: req.user.companyId,
        customerId,
        saleDate: new Date(saleDate),
        totalAmount: String(totalAmount),
        installmentCount: parseInt(installmentCount) || 1,
        status: status || 'pago',
        paidAmount: status === 'pago' ? String(totalAmount) : '0',
        description: description || 'Venda sem descrição',
        categoryId,
        paymentMethod
      };

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
          await storage.createTransaction(req.user.companyId, transactionData as any);
        }
      } else {
        const count = parseInt(installmentCount) || 1;
        const totalValue = parseFloat(totalAmount);
        const amountPerInstallment = totalValue / count;
        
        for (let i = 0; i < count; i++) {
          const dueDate = new Date(saleDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          
          const transactionData = {
            companyId: req.user.companyId,
            type: 'income',
            description: count > 1 ? `${description || 'Venda'} (${i + 1}/${count})` : (description || 'Venda'),
            amount: String(amountPerInstallment.toFixed(2)),
            date: dueDate,
            status: status === 'pago' ? 'pago' : 'pendente',
            categoryId,
            customerId,
            paymentMethod,
            installmentNumber: i + 1,
            installmentTotal: count,
            installmentGroup: installmentGroupId,
            shift: 'default'
          };
          await storage.createTransaction(req.user.companyId, transactionData as any);
        }
      }

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
        purchaseDate: new Date(purchaseDate),
        totalAmount: String(totalAmount),
        installmentCount: installmentCount || 1,
        status: status || 'pago',
        paidAmount: status === 'pago' ? String(totalAmount) : '0',
        description: description || 'Compra sem descrição',
        categoryId,
        paymentMethod
      };

      const purchase = await storage.createPurchase(req.user.companyId, purchaseData as any);
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
        const amountPerInstallment = totalValue / count;
        
        for (let i = 0; i < count; i++) {
          const dueDate = new Date(purchaseDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          
          const transactionData = {
            companyId: req.user.companyId,
            type: 'expense',
            description: count > 1 ? `${description || 'Compra'} (${i + 1}/${count})` : (description || 'Compra'),
            amount: String(amountPerInstallment.toFixed(2)),
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
