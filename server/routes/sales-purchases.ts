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
      res.json(salesData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
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
            type: 'compra',
            description: `${description} (${i + 1}/${customInstallments.length})`,
            amount: String(inst.amount),
            date: new Date(inst.due_date),
            status: status === 'pago' ? 'pago' : 'pendente',
            categoryId,
            supplierId,
            paymentMethod,
            installmentNumber: i + 1,
            installmentTotal: customInstallments.length,
            installmentGroup: installmentGroupId
          };
          await storage.createTransaction(req.user.companyId, transactionData as any);
        }
      } else {
        const count = parseInt(installmentCount) || 1;
        const amountPerInstallment = parseFloat(totalAmount) / count;
        
        for (let i = 0; i < count; i++) {
          const dueDate = new Date(purchaseDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          
          const transactionData = {
            companyId: req.user.companyId,
            type: 'compra',
            description: count > 1 ? `${description} (${i + 1}/${count})` : description,
            amount: String(amountPerInstallment.toFixed(2)),
            date: dueDate,
            status: status === 'pago' ? 'pago' : 'pendente',
            categoryId,
            supplierId,
            paymentMethod,
            installmentNumber: i + 1,
            installmentTotal: count,
            installmentGroup: installmentGroupId
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
