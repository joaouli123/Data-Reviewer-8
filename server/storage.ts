import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  bankStatementItems, transactions, users, customers, suppliers, categories,
  companies, sales, purchases, cashFlow
} from "../shared/schema";

// Função para formatar dinheiro corretamente
function sanitizeMoney(value: any): string {
  if (!value) return "0.00";
  if (typeof value === 'number') return value.toFixed(2);
  return String(value).replace(/\./g, '').replace(',', '.');
}

function normalizeDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export class DatabaseStorage {

  // --- MÉTODOS DE VENDAS E COMPRAS ---
  async getSales(companyId: any) {
    return await db.select().from(sales).where(eq(sales.companyId, companyId)).orderBy(desc(sales.date));
  }

  async createSale(companyId: any, data: any) {
    const [sale] = await db.insert(sales).values({ ...data, companyId }).returning();
    return sale;
  }

  async getPurchases(companyId: any) {
    return await db.select().from(purchases).where(eq(purchases.companyId, companyId)).orderBy(desc(purchases.date));
  }

  async createPurchase(companyId: any, data: any) {
    const [purchase] = await db.insert(purchases).values({ ...data, companyId }).returning();
    return purchase;
  }

  // --- MÉTODOS BANCÁRIOS (Versão Corrigida para UUID) ---

  async getBankStatementItems(companyId: string) {
    if (!companyId) return [];
    return await db.select()
                   .from(bankStatementItems)
                   .where(eq(bankStatementItems.companyId, companyId))
                   .orderBy(desc(bankStatementItems.date));
  }

  async createBankStatementItem(companyId: string, data: any) {
    if (!companyId) throw new Error("Company ID is required");
    const [item] = await db.insert(bankStatementItems)
                           .values({ ...data, companyId })
                           .returning();
    return item;
  }

  async matchBankStatementItem(companyId: any, bankItemId: any, transactionId: any) {
    return await db.transaction(async (tx) => {
      // 1. Atualiza o item bancário
      const [updated] = await tx.update(bankStatementItems)
                             .set({ status: "RECONCILED", transactionId })
                             .where(and(eq(bankStatementItems.companyId, companyId), eq(bankStatementItems.id, bankItemId)))
                             .returning();
      
      // 2. Marca a transação como conciliada
      if (transactionId) {
        await tx.update(transactions)
                .set({ isReconciled: true })
                .where(and(eq(transactions.companyId, companyId), eq(transactions.id, transactionId)));
      }
      
      return updated;
    });
  }

  async clearBankStatementItems(companyId: any) {
    await db.delete(bankStatementItems).where(eq(bankStatementItems.companyId, companyId));
  }

  async getBankStatementItemById(companyId: any, id: any) {
     return (await db.select().from(bankStatementItems).where(and(eq(bankStatementItems.companyId, companyId), eq(bankStatementItems.id, id))))[0];
  }

  // --- MÉTODOS GERAIS (MANTENHA OS OUTROS MÉTODOS AQUI) ---
  // IMPORTANTE: Mantenha os métodos abaixo (getTransactions, createCustomer, etc.)
  // copiando do seu arquivo original, pois eles são necessários para o resto do sistema.
  // Vou colocar os principais aqui para garantir que compile:

  async getCategories(companyId: any) {
    if (!companyId) return [];
    return await db.select().from(categories).where(eq(categories.companyId, companyId));
  }

  async createCategory(companyId: any, data: any) {
    const [category] = await db.insert(categories).values({ ...data, companyId }).returning();
    return category;
  }

  async updateCategory(companyId: any, id: any, data: any) {
    const [updated] = await db.update(categories)
      .set(data)
      .where(and(eq(categories.companyId, companyId), eq(categories.id, id)))
      .returning();
    return updated;
  }

  async deleteCategory(companyId: any, id: any) {
    await db.delete(categories).where(and(eq(categories.companyId, companyId), eq(categories.id, id)));
  }

  async getTransactions(companyId: any) {
    if (!companyId) return [];
    const rows = await db.select().from(transactions).where(eq(transactions.companyId, companyId)).orderBy(desc(transactions.date));
    return rows.map((t: any) => {
      const fallback = t.paymentDate || t.createdAt || t.created_at;
      const date = t.date ? normalizeDate(t.date) : normalizeDate(fallback);
      return { ...t, date };
    });
  }

  async createTransaction(companyId: any, data: any) {
    const safeData = { ...data };
    safeData.date = normalizeDate(safeData.date);
    if (safeData.paymentDate) {
      safeData.paymentDate = normalizeDate(safeData.paymentDate);
    }
    const [transaction] = await db.insert(transactions).values({ ...safeData, companyId }).returning();
    return transaction;
  }

  async updateTransaction(companyId: any, id: any, data: any) {
    const safeData = { ...data };
    if (safeData.date) {
      safeData.date = normalizeDate(safeData.date);
    }
    if (safeData.paymentDate) {
      safeData.paymentDate = normalizeDate(safeData.paymentDate);
    }
    const [updated] = await db.update(transactions).set(safeData).where(and(eq(transactions.companyId, companyId), eq(transactions.id, id))).returning();
    return updated;
  }

  async deleteTransaction(companyId: any, id: any) {
    await db.delete(transactions).where(and(eq(transactions.companyId, companyId), eq(transactions.id, id)));
  }

  // Busca transações por grupo (parcelas)
  async getTransactionsByGroup(companyId: any, installmentGroup: string) {
    if (!companyId || !installmentGroup) return [];
    return await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.companyId, companyId),
        eq(transactions.installmentGroup, installmentGroup)
      ))
      .orderBy(transactions.installmentNumber);
  }

  // Atualiza múltiplas transações de um grupo
  async updateTransactionsInGroup(companyId: any, installmentGroup: string, updates: Array<{ id: string; date: Date }>) {
    const results = [];
    for (const update of updates) {
      const [updated] = await db.update(transactions)
        .set({ date: update.date })
        .where(and(
          eq(transactions.companyId, companyId),
          eq(transactions.id, update.id)
        ))
        .returning();
      if (updated) results.push(updated);
    }
    return results;
  }

  async getCustomers(companyId: any) {
    if (!companyId) return [];
    const allCustomers = await db.select().from(customers).where(eq(customers.companyId, companyId));
    
    // Busca todas as transações de entrada (receita)
    const allTransactions = await db.select().from(transactions).where(
      and(
        eq(transactions.companyId, companyId), 
        sql`${transactions.type} IN ('venda', 'venda_prazo', 'receita', 'income')`
      )
    );

    return allCustomers.map(customer => {
      const totalSales = allTransactions
        .filter(t => t.customerId === customer.id)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || "0") + parseFloat(t.interest || "0")), 0);
      return { ...customer, totalSales: totalSales.toFixed(2) };
    });
  }

  async createCustomer(companyId: any, data: any) {
    const [customer] = await db.insert(customers).values({ ...data, companyId }).returning();
    return customer;
  }

  async updateCustomer(companyId: any, id: any, data: any) {
    const [updated] = await db.update(customers).set(data).where(and(eq(customers.companyId, companyId), eq(customers.id, id))).returning();
    return updated;
  }

  async deleteCustomer(companyId: any, id: any) {
    await db.delete(customers).where(and(eq(customers.companyId, companyId), eq(customers.id, id)));
  }

  async getSuppliers(companyId: any) {
    if (!companyId) return [];
    const allSuppliers = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
    
    // Busca todas as transações de saída (despesa)
    const allTransactions = await db.select().from(transactions).where(
      and(
        eq(transactions.companyId, companyId),
        sql`${transactions.type} IN ('compra', 'compra_prazo', 'despesa', 'expense')`
      )
    );

    return allSuppliers.map(supplier => {
      const totalPurchases = allTransactions
        .filter(t => t.supplierId === supplier.id)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || "0") + parseFloat(t.interest || "0")), 0);
      return { ...supplier, totalPurchases: totalPurchases.toFixed(2) };
    });
  }

  // --- Fluxo de Caixa agregado ---
  async getCashFlow(companyId: any) {
    if (!companyId) return [];
    return await db.select()
      .from(cashFlow)
      .where(eq(cashFlow.companyId, companyId))
      .orderBy(desc(cashFlow.date));
  }

  async createSupplier(companyId: any, data: any) {
    const [supplier] = await db.insert(suppliers).values({ ...data, companyId }).returning();
    return supplier;
  }

  async updateSupplier(companyId: any, id: any, data: any) {
    const [updated] = await db.update(suppliers).set(data).where(and(eq(suppliers.companyId, companyId), eq(suppliers.id, id))).returning();
    return updated;
  }

  async deleteSupplier(companyId: any, id: any) {
    await db.delete(suppliers).where(and(eq(suppliers.companyId, companyId), eq(suppliers.id, id)));
  }
}

export const storage = new DatabaseStorage();