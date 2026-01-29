import { Express } from "express";
import { storage } from "../storage";
import { users } from "../../shared/schema";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";

// Define PERMISSIONS object since it might not be exported from schema or to be safe
const PERMISSIONS = {
  VIEW_TRANSACTIONS: 'view_transactions',
  CREATE_TRANSACTIONS: 'create_transactions',
  EDIT_TRANSACTIONS: 'edit_transactions',
  DELETE_TRANSACTIONS: 'delete_transactions',
  IMPORT_BANK: 'import_bank'
};

// Evita shift de data por timezone e aceita YYYY-MM-DD ou DD/MM/YYYY
const parseLocalDate = (value: string | Date) => {
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
};

// Helper to check permissions
const checkPermission = async (req: AuthenticatedRequest, permission: string) => {
  if (req.user?.role === 'admin' || req.user?.isSuperAdmin) return true;
  
  // Buscar usuário no banco para garantir que temos as permissões atualizadas
  const [dbUser] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
  if (!dbUser || !dbUser.permissions) return false;
  
  try {
    const perms = typeof dbUser.permissions === 'string' ? JSON.parse(dbUser.permissions) : dbUser.permissions;
    return !!perms[permission];
  } catch (e) {
    return false;
  }
};

export function registerTransactionRoutes(app: Express) {
  app.get("/api/transactions", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      
      if (!await checkPermission(req, PERMISSIONS.VIEW_TRANSACTIONS)) {
        return res.status(403).json({ error: "Você não tem permissão para visualizar transações" });
      }

      const { customerId, supplierId, type, limit, offset } = req.query;
      const parsedLimit = limit ? Math.min(Number(limit), 500) : null;
      const parsedOffset = offset ? Math.max(Number(offset), 0) : 0;

      if (parsedLimit) {
        const [data, total] = await Promise.all([
          storage.getTransactionsPaginated(req.user.companyId, {
            customerId: customerId ? String(customerId) : undefined,
            supplierId: supplierId ? String(supplierId) : undefined,
            type: type ? String(type) : undefined,
            limit: parsedLimit,
            offset: parsedOffset,
          }),
          storage.countTransactions(req.user.companyId, {
            customerId: customerId ? String(customerId) : undefined,
            supplierId: supplierId ? String(supplierId) : undefined,
            type: type ? String(type) : undefined,
          }),
        ]);
        return res.json({ data, total, limit: parsedLimit, offset: parsedOffset });
      }

      let transactions = await storage.getTransactions(req.user.companyId);

      if (customerId) {
        transactions = transactions.filter(t => String(t.customerId) === String(customerId));
      }
      if (supplierId) {
        transactions = transactions.filter(t => String(t.supplierId) === String(supplierId));
      }
      if (type) {
        // Normalizar tipos para busca retrocompatível
        if (type === 'venda') {
          transactions = transactions.filter(t => t.type === 'venda' || t.type === 'income');
        } else if (type === 'compra') {
          transactions = transactions.filter(t => t.type === 'compra' || t.type === 'expense');
        } else {
          transactions = transactions.filter(t => t.type === type);
        }
      }
      
      res.json(transactions);
    } catch (error) {
      console.error("[Transactions] list error", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      
      if (!await checkPermission(req, PERMISSIONS.CREATE_TRANSACTIONS)) {
        return res.status(403).json({ error: "Você não tem permissão para criar transações" });
      }
      
      const body = { ...req.body };

      const statusValue = String(body.status || '').toLowerCase();
      const isPendingStatus = ['pendente', 'agendado', 'pending', 'scheduled'].includes(statusValue);
      
      // Garantir que date sempre exista e seja um Date object
      if (!body.date) {
        body.date = new Date();
      } else if (typeof body.date === 'string') {
        body.date = parseLocalDate(body.date);
      }
      
      // Garantir paymentDate seja Date ou null
      if (isPendingStatus) {
        body.paymentDate = null;
      } else if (body.paymentDate && typeof body.paymentDate === 'string') {
        body.paymentDate = parseLocalDate(body.paymentDate);
      } else if (!body.paymentDate) {
        body.paymentDate = null;
      }
      
      // Ensure amount is handled as string for decimal
      if (typeof body.amount === 'number') {
        body.amount = body.amount.toFixed(2);
      }
      
      // Validação manual básica
      if (!body.type) {
        return res.status(400).json({ error: "Type is required" });
      }
      if (!body.amount) {
        return res.status(400).json({ error: "Amount is required" });
      }
      
      // Preparar dados para inserção (sem usar Zod schema)
      let data = {
        customerId: body.customerId || null,
        supplierId: body.supplierId || null,
        categoryId: body.categoryId || null,
        type: body.type,
        amount: String(body.amount),
        paidAmount: body.paidAmount ? String(body.paidAmount) : null,
        interest: body.interest ? String(body.interest) : "0",
        cardFee: body.cardFee ? String(body.cardFee) : "0",
        hasCardFee: Boolean(body.hasCardFee),
        paymentDate: body.paymentDate,
        description: body.description || null,
        date: body.date, // Já é um Date object
        shift: body.shift || "Geral",
        status: body.status || "pendente",
        installmentGroup: body.installmentGroup || null,
        installmentNumber: body.installmentNumber ? Number(body.installmentNumber) : null,
        installmentTotal: body.installmentTotal ? Number(body.installmentTotal) : null,
        paymentMethod: body.paymentMethod || null,
        isReconciled: Boolean(body.isReconciled),
      };

      if (!(data.date instanceof Date) || Number.isNaN(data.date.getTime())) {
        data = { ...data, date: new Date() };
      }
      
      const transaction = await storage.createTransaction(req.user.companyId, data);
      res.status(201).json(transaction);
    } catch (error: any) {
      console.error("[Transactions] create error", error);
      res.status(400).json({ error: error.message || "Invalid transaction data" });
    }
  });

  app.delete("/api/transactions/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });

      if (!await checkPermission(req, PERMISSIONS.DELETE_TRANSACTIONS)) {
        return res.status(403).json({ error: "Você não tem permissão para excluir transações" });
      }

      await storage.deleteTransaction(req.user.companyId, req.params.id);
      res.sendStatus(204);
    } catch (error) {
      console.error("[Transactions] delete error", error);
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  app.patch("/api/transactions/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      
      if (!await checkPermission(req, PERMISSIONS.EDIT_TRANSACTIONS)) {
        return res.status(403).json({ error: "Você não tem permissão para editar transações" });
      }

      const body = { ...req.body };
      const statusValue = String(body.status || '').toLowerCase();
      const isPendingStatus = ['pendente', 'agendado', 'pending', 'scheduled'].includes(statusValue);
      if (body.date && typeof body.date === 'string') {
        body.date = parseLocalDate(body.date);
      }
      if (isPendingStatus) {
        body.paymentDate = null;
      } else if (body.paymentDate && typeof body.paymentDate === 'string') {
        body.paymentDate = parseLocalDate(body.paymentDate);
      }
      
      const transaction = await storage.updateTransaction(req.user.companyId, req.params.id, body);
      res.json(transaction);
    } catch (error: any) {
      console.error("[Transactions] update error", error);
      res.status(400).json({ error: error.message || "Failed to update transaction" });
    }
  });

  // Endpoint para atualizar datas de todas as parcelas de um grupo
  // Quando a data da primeira parcela é alterada, recalcula as demais
  app.patch("/api/transactions/group/:installmentGroup/dates", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      
      if (!await checkPermission(req, PERMISSIONS.EDIT_TRANSACTIONS)) {
        return res.status(403).json({ error: "Você não tem permissão para editar transações" });
      }

      const { installmentGroup } = req.params;
      const { newFirstDate } = req.body;

      if (!installmentGroup || !newFirstDate) {
        return res.status(400).json({ error: "Grupo e nova data são obrigatórios" });
      }

      // Buscar todas as parcelas do grupo
      const groupTransactions = await storage.getTransactionsByGroup(req.user.companyId, installmentGroup);
      
      if (groupTransactions.length === 0) {
        return res.status(404).json({ error: "Grupo de parcelas não encontrado" });
      }

      // Ordenar por número da parcela
      groupTransactions.sort((a: any, b: any) => (a.installmentNumber || 1) - (b.installmentNumber || 1));

      // Calcular as novas datas baseadas na primeira parcela
      const baseDate = parseLocalDate(newFirstDate);
      const updates: Array<{ id: string; date: Date }> = [];

      for (let i = 0; i < groupTransactions.length; i++) {
        const t = groupTransactions[i] as any;
        // Nova data = data base + i meses
        const newDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
        updates.push({ id: t.id, date: newDate });
      }

      // Atualizar todas as transações
      const updatedTransactions = await storage.updateTransactionsInGroup(req.user.companyId, installmentGroup, updates);
      
      res.json({ 
        success: true, 
        message: `${updatedTransactions.length} parcelas atualizadas`,
        transactions: updatedTransactions 
      });
    } catch (error: any) {
      console.error("[Transactions] update group dates error", error);
      res.status(400).json({ error: error.message || "Erro ao atualizar datas do grupo" });
    }
  });
  
  // Endpoint temporário para corrigir transações sem data
  app.post("/api/transactions/fix-null-dates", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      
      console.log(`[Fix] Iniciando correção de datas nulas para company: ${req.user.companyId}`);
      
      const beforeResult = await db.execute(sql`
        select count(*)::int as count
        from transactions
        where company_id = ${req.user.companyId}
          and date is null
      `);
      const beforeCount = Number((beforeResult as any)?.rows?.[0]?.count ?? 0);

      await db.execute(sql`
        update transactions
        set date = coalesce(payment_date, created_at, now())
        where company_id = ${req.user.companyId}
          and date is null
      `);

      const afterResult = await db.execute(sql`
        select count(*)::int as count
        from transactions
        where company_id = ${req.user.companyId}
          and date is null
      `);
      const afterCount = Number((afterResult as any)?.rows?.[0]?.count ?? 0);
      const updatedCount = Math.max(0, beforeCount - afterCount);

      res.json({
        success: true,
        message: `${updatedCount} transações corrigidas`,
        totalWithNullDate: beforeCount,
        fixed: updatedCount,
        remainingNullDates: afterCount,
      });
    } catch (error: any) {
      console.error("[Fix] Error fixing null dates", error);
      res.status(500).json({ error: error.message || "Erro ao corrigir datas" });
    }
  });
}
