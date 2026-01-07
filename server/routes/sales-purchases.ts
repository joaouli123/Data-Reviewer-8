import { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest } from "../middleware";

// Função auxiliar para garantir que o valor seja um número limpo (decimal US)
function parseMoney(value: any): number {
  if (typeof value === 'number') return value;
  const cleanValue = String(value || "0")
    .replace(/\./g, '')    // Remove pontos de milhar
    .replace(',', '.');    // Converte vírgula decimal em ponto
  return parseFloat(cleanValue) || 0;
}

export function registerSalesPurchasesRoutes(app: Express) {
  app.get("/api/sales", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const salesData = await storage.getSales(req.user.companyId);
      res.json(salesData.filter(s => s.customerId));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.get("/api/purchases", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const purchasesData = await storage.getPurchases(req.user.companyId);
      res.json(purchasesData.filter(p => p.supplierId));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  app.post("/api/sales", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { customerId, saleDate, totalAmount, installmentCount, status, description, categoryId, paymentMethod, customInstallments } = req.body;

      const cleanTotal = parseMoney(totalAmount);

      const saleData = {
        companyId: req.user.companyId,
        customerId,
        date: new Date(saleDate),
        amount: cleanTotal.toFixed(2),
        installmentCount: parseInt(installmentCount) || 1,
        status: status || 'pago',
        paidAmount: status === 'pago' ? cleanTotal.toFixed(2) : '0.00',
        description: description || 'Venda sem descrição',
        categoryId,
        paymentMethod
      };

      const sale = await storage.createSale(req.user.companyId, saleData as any);
      const installmentGroupId = `sale-${sale.id}-${Date.now()}`;

      // Lógica de Parcelas - Otimizado com Promise.all
      const count = (customInstallments && customInstallments.length > 0) 
        ? customInstallments.length 
        : (parseInt(installmentCount) || 1);

      const amountPerInstallment = Math.floor((cleanTotal / count) * 100) / 100;
      const lastInstallmentAmount = (cleanTotal - (amountPerInstallment * (count - 1))).toFixed(2);

      const transactionPromises = Array.from({ length: count }, (_, i) => {
        const isLast = i === count - 1;
        const currentAmount = isLast ? lastInstallmentAmount : amountPerInstallment.toFixed(2);

        let dueDate = new Date(saleDate);
        if (customInstallments && customInstallments[i]) {
          dueDate = new Date(customInstallments[i].due_date || customInstallments[i].date);
        } else {
          dueDate.setMonth(dueDate.getMonth() + i);
        }

        return storage.createTransaction(req.user.companyId, {
          companyId: req.user.companyId,
          type: 'income',
          description: count > 1 ? `${description || 'Venda'} (${i + 1}/${count})` : (description || 'Venda'),
          amount: currentAmount,
          date: dueDate,
          status: status === 'pago' ? 'pago' : 'pendente',
          categoryId,
          customerId,
          paymentMethod,
          installmentNumber: i + 1,
          installmentTotal: count,
          installmentGroup: installmentGroupId,
          shift: 'default'
        } as any);
      });

      await Promise.all(transactionPromises);

      res.status(201).json(sale);
    } catch (error: any) {
      console.error("[Sales Error]", error);
      res.status(400).json({ error: error.message || "Failed to create sale" });
    }
  });

  app.post("/api/purchases", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { supplierId, purchaseDate, totalAmount, installmentCount, status, description, categoryId, paymentMethod, customInstallments } = req.body;

      const cleanTotal = parseMoney(totalAmount);

      const purchaseData = {
        companyId: req.user.companyId,
        supplierId,
        date: new Date(purchaseDate),
        amount: cleanTotal.toFixed(2),
        installmentCount: parseInt(installmentCount) || 1,
        status: status || 'pago',
        paidAmount: status === 'pago' ? cleanTotal.toFixed(2) : '0.00',
        description: description || 'Compra sem descrição',
        categoryId,
        paymentMethod
      };

      const purchase = await storage.createPurchase(req.user.companyId, purchaseData as any);
      const installmentGroupId = `purchase-${purchase.id}-${Date.now()}`;

      // Lógica de Parcelas - Otimizado com Promise.all
      const count = (customInstallments && customInstallments.length > 0) 
        ? customInstallments.length 
        : (parseInt(installmentCount) || 1);

      const amountPerInstallment = Math.floor((cleanTotal / count) * 100) / 100;
      const lastInstallmentAmount = (cleanTotal - (amountPerInstallment * (count - 1))).toFixed(2);

      const transactionPromises = Array.from({ length: count }, (_, i) => {
        const isLast = i === count - 1;
        const currentAmount = isLast ? lastInstallmentAmount : amountPerInstallment.toFixed(2);

        let dueDate = new Date(purchaseDate);
        if (customInstallments && customInstallments[i]) {
          dueDate = new Date(customInstallments[i].date || customInstallments[i].due_date);
        } else {
          dueDate.setMonth(dueDate.getMonth() + i);
        }

        return storage.createTransaction(req.user.companyId, {
          companyId: req.user.companyId,
          type: 'expense',
          description: count > 1 ? `${description || 'Compra'} (${i + 1}/${count})` : (description || 'Compra'),
          amount: currentAmount,
          date: dueDate,
          status: status === 'pago' ? 'pago' : 'pendente',
          categoryId,
          supplierId,
          paymentMethod,
          installmentNumber: i + 1,
          installmentTotal: count,
          installmentGroup: installmentGroupId,
          shift: 'Normal'
        } as any);
      });

      await Promise.all(transactionPromises);

      res.status(201).json(purchase);
    } catch (error: any) {
      console.error("[Purchases Error]", error);
      res.status(400).json({ error: error.message || "Failed to create purchase" });
    }
  });
}