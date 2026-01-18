import { Express } from "express";
import { storage } from "../storage";
import { insertTransactionSchema, users } from "../../shared/schema";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Define PERMISSIONS object since it might not be exported from schema or to be safe
const PERMISSIONS = {
  VIEW_TRANSACTIONS: 'view_transactions',
  CREATE_TRANSACTIONS: 'create_transactions',
  EDIT_TRANSACTIONS: 'edit_transactions',
  DELETE_TRANSACTIONS: 'delete_transactions',
  IMPORT_BANK: 'import_bank'
};

// Evita shift de data por timezone (YYYY-MM-DD)
const parseLocalDate = (value: string) => {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
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

      const { customerId, supplierId, type } = req.query;
      
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
      if (body.date && typeof body.date === 'string') {
        body.date = parseLocalDate(body.date);
      }
      if (body.paymentDate && typeof body.paymentDate === 'string') {
        body.paymentDate = parseLocalDate(body.paymentDate);
      }
      
      // Ensure amount is handled as string for decimal validation if it comes as number
      if (typeof body.amount === 'number') {
        body.amount = body.amount.toFixed(2);
      }
      
      const data = insertTransactionSchema.parse(body);
      const transaction = await storage.createTransaction(req.user.companyId, data);
      res.status(201).json(transaction);
    } catch (error: any) {
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
      if (body.date && typeof body.date === 'string') {
        body.date = parseLocalDate(body.date);
      }
      if (body.paymentDate && typeof body.paymentDate === 'string') {
        body.paymentDate = parseLocalDate(body.paymentDate);
      }
      
      const transaction = await storage.updateTransaction(req.user.companyId, req.params.id, body);
      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update transaction" });
    }
  });
}
