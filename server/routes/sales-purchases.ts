import { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest, requirePermission } from "../middleware";
import { z } from "zod";

// Função auxiliar para garantir que o valor seja um número limpo (decimal US)
function parseMoney(value: any): number {
  if (typeof value === 'number') return value;
  const cleanValue = String(value || "0")
    .replace(/\./g, '')    // Remove pontos de milhar
    .replace(',', '.');    // Converte vírgula decimal em ponto
  return parseFloat(cleanValue) || 0;
}

// Evita shift de data por timezone e aceita YYYY-MM-DD ou DD/MM/YYYY
function parseLocalDate(value: string | Date): Date {
  if (!value) return new Date();
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }

  const str = String(value).trim();

  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  const dmyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Calcula uma data segura para a parcela, respeitando as datas customizadas
function computeInstallmentDate(baseDateStr: string, customInstallments: any[] | undefined, index: number) {
  const baseDate = parseLocalDate(baseDateStr);

  // Log para debug
  console.log(`[computeInstallmentDate] index=${index}, hasCustom=${!!customInstallments}, length=${customInstallments?.length || 0}`);
  
  if (customInstallments && customInstallments.length > 0 && customInstallments[index]) {
    // Se tem data específica na parcela, usa diretamente
    const customDate = customInstallments[index].due_date || customInstallments[index].date;
    console.log(`[computeInstallmentDate] customDate for index ${index}:`, customDate);
    if (customDate) {
      const parsed = parseLocalDate(customDate);
      console.log(`[computeInstallmentDate] parsed customDate:`, parsed);
      return parsed;
    }
  }

  // Se não tem parcelas customizadas com datas, espalha por meses
  // Primeira parcela = próximo mês, segunda = +2 meses, etc.
  const spread = new Date(baseDate);
  spread.setMonth(baseDate.getMonth() + 1 + index); // +1 para começar no próximo mês
  console.log(`[computeInstallmentDate] spread date for index ${index}:`, spread);
  return spread;
}

export function registerSalesPurchasesRoutes(app: Express) {
  const saleSchema = z.object({
    customerId: z.union([z.string(), z.number()]),
    saleDate: z.string().min(1),
    totalAmount: z.union([z.string(), z.number()]),
    installmentCount: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    categoryId: z.union([z.string(), z.number()]).optional().nullable(),
    paymentMethod: z.string().optional(),
    hasCardFee: z.boolean().optional(),
    cardFee: z.union([z.string(), z.number()]).optional(),
    customInstallments: z.array(
      z.object({
        date: z.string().optional(),
        due_date: z.string().optional(),
        amount: z.union([z.string(), z.number()]).optional()
      })
    ).optional()
  });

  const purchaseSchema = z.object({
    supplierId: z.union([z.string(), z.number()]),
    purchaseDate: z.string().min(1),
    totalAmount: z.union([z.string(), z.number()]),
    installmentCount: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    categoryId: z.union([z.string(), z.number()]).optional().nullable(),
    paymentMethod: z.string().optional(),
    hasCardFee: z.boolean().optional(),
    cardFee: z.union([z.string(), z.number()]).optional(),
    customInstallments: z.array(
      z.object({
        date: z.string().optional(),
        due_date: z.string().optional(),
        amount: z.union([z.string(), z.number()]).optional()
      })
    ).optional()
  });
  app.get("/api/sales", authMiddleware, requirePermission("view_transactions"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const salesData = await storage.getSales(req.user.companyId);
      res.json(salesData.filter(s => s.customerId));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.get("/api/purchases", authMiddleware, requirePermission("view_transactions"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const purchasesData = await storage.getPurchases(req.user.companyId);
      res.json(purchasesData.filter(p => p.supplierId));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  app.post("/api/sales", authMiddleware, requirePermission("create_transactions"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const parsed = saleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos" });
      }

      const { customerId, saleDate, totalAmount, installmentCount, status, description, categoryId, paymentMethod, customInstallments, hasCardFee, cardFee } = parsed.data;

      const cleanTotal = parseMoney(totalAmount);

      const saleData = {
        companyId: req.user.companyId,
        customerId,
        date: parseLocalDate(saleDate),
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

        const dueDate = computeInstallmentDate(saleDate, customInstallments, i);

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
          shift: 'default',
          hasCardFee: hasCardFee || false,
          cardFee: hasCardFee ? (parseFloat(String(cardFee)) || 0).toFixed(2) : '0'
        } as any);
      });

      await Promise.all(transactionPromises);

      res.status(201).json(sale);
    } catch (error: any) {
      console.error("[Sales Error]", error);
      res.status(400).json({ error: error.message || "Failed to create sale" });
    }
  });

  app.post("/api/purchases", authMiddleware, requirePermission("create_transactions"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const parsed = purchaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos" });
      }

      const { supplierId, purchaseDate, totalAmount, installmentCount, status, description, categoryId, paymentMethod, customInstallments, hasCardFee, cardFee } = parsed.data;

      const cleanTotal = parseMoney(totalAmount);

      const purchaseData = {
        companyId: req.user.companyId,
        supplierId,
        date: parseLocalDate(purchaseDate),
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

      // DEBUG: Log das parcelas customizadas recebidas
      console.log('[Purchases] customInstallments recebidas:', JSON.stringify(customInstallments, null, 2));

      // Lógica de Parcelas - Otimizado com Promise.all
      const count = (customInstallments && customInstallments.length > 0) 
        ? customInstallments.length 
        : (parseInt(installmentCount) || 1);

      console.log('[Purchases] count de parcelas:', count);

      const amountPerInstallment = Math.floor((cleanTotal / count) * 100) / 100;
      const lastInstallmentAmount = (cleanTotal - (amountPerInstallment * (count - 1))).toFixed(2);

      const transactionPromises = Array.from({ length: count }, (_, i) => {
        const isLast = i === count - 1;
        const currentAmount = isLast ? lastInstallmentAmount : amountPerInstallment.toFixed(2);

        const dueDate = computeInstallmentDate(purchaseDate, customInstallments, i);

        return storage.createTransaction(req.user.companyId, {
          companyId: req.user.companyId,
          type: 'compra',
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
          shift: 'Normal',
          hasCardFee: hasCardFee || false,
          cardFee: hasCardFee ? (parseFloat(String(cardFee)) || 0).toFixed(2) : '0'
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