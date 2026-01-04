import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  bankStatementItems, transactions, users, customers, suppliers, categories,
  companies, // Adicione outros imports se necessário
} from "../shared/schema";

// Função para formatar dinheiro corretamente
function sanitizeMoney(value: any): string {
  if (!value) return "0.00";
  if (typeof value === 'number') return value.toFixed(2);
  return String(value).replace(/\./g, '').replace(',', '.');
}

export class DatabaseStorage {

  // --- MÉTODOS BANCÁRIOS (Versão Corrigida para UUID) ---

  async getBankStatementItems(companyId: any) {
    // REMOVIDO parseInt! Agora aceita o UUID como string pura.
    console.log(`[Storage] Buscando itens para CompanyID: ${companyId}`);
    return await db.select()
                   .from(bankStatementItems)
                   .where(eq(bankStatementItems.companyId, companyId))
                   .orderBy(desc(bankStatementItems.date));
  }

  async createBankStatementItem(companyId: any, data: any) {
    // Salva direto, sem converter ID
    const [item] = await db.insert(bankStatementItems)
                           .values({ ...data, companyId })
                           .returning();
    return item;
  }

  async matchBankStatementItem(companyId: any, bankItemId: any, transactionId: any) {
    return await db.transaction(async (tx) => {
      const [updated] = await tx.update(bankStatementItems)
                             .set({ status: "RECONCILED", transactionId })
                             .where(and(eq(bankStatementItems.companyId, companyId), eq(bankStatementItems.id, bankItemId)))
                             .returning();
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
    return await db.select().from(categories).where(eq(categories.companyId, companyId));
  }

  async createCategory(companyId: any, data: any) {
    const [category] = await db.insert(categories).values({ ...data, companyId }).returning();
    return category;
  }

  async deleteCategory(companyId: any, id: any) {
    await db.delete(categories).where(and(eq(categories.companyId, companyId), eq(categories.id, id)));
  }

  async getTransactions(companyId: any) {
    return await db.select().from(transactions).where(eq(transactions.companyId, companyId)).orderBy(desc(transactions.date));
  }

  async getCustomers(companyId: any) {
    return await db.select().from(customers).where(eq(customers.companyId, companyId));
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
    return await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
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