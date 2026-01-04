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

  async getTransactions(companyId: any) {
    return await db.select().from(transactions).where(eq(transactions.companyId, companyId)).orderBy(desc(transactions.date));
  }

  // (Se o seu arquivo original tinha mais métodos, mantenha-os ou adicione-os aqui)
  // ...
}

export const storage = new DatabaseStorage();