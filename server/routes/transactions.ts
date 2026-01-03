import { Express } from "express";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import { transactions, insertTransactionSchema } from "../../shared/schema";

export function registerTransactionRoutes(app: Express) {
  app.get("/api/transactions", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const companyId = req.user.companyId;
      const { customerId } = req.query;
      
      let transactionsList;
      if (customerId) {
        transactionsList = await db
          .select()
          .from(transactions)
          .where(and(
            eq(transactions.companyId, companyId),
            eq(transactions.customerId, String(customerId))
          ));
      } else {
        transactionsList = await storage.getTransactions(companyId);
      }

      const converted = transactionsList.map(t => ({
        ...t,
        amount: t.amount ? parseFloat(t.amount.toString()) : 0,
        paidAmount: t.paidAmount ? parseFloat(t.paidAmount.toString()) : null,
        interest: t.interest ? parseFloat(t.interest.toString()) : 0
      }));

      const sorted = converted.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });

      res.json(sorted);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(req.user.companyId, data);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid transaction data" });
    }
  });

  app.delete("/api/transactions/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.deleteTransaction(req.user.companyId, parseInt(req.params.id));
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete transaction" });
    }
  });
}
