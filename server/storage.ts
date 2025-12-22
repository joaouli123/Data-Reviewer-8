import { db } from "./db";
import { eq, and, gte, lte, sql, desc, leftJoin } from "drizzle-orm";
import {
  customers,
  suppliers,
  categories,
  transactions,
  cashFlow,
  type InsertCustomer,
  type InsertSupplier,
  type InsertCategory,
  type InsertTransaction,
  type InsertCashFlow,
  type Customer,
  type Supplier,
  type Category,
  type Transaction,
  type CashFlow,
} from "../shared/schema";

export interface IStorage {
  // Customer operations
  createCustomer(data: InsertCustomer): Promise<Customer>;
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;

  // Supplier operations
  createSupplier(data: InsertSupplier): Promise<Supplier>;
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  updateSupplier(id: string, data: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;

  // Category operations
  createCategory(data: InsertCategory): Promise<Category>;
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  updateCategory(id: string, data: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Transaction operations
  createTransaction(data: InsertTransaction): Promise<Transaction>;
  getTransactions(): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  updateTransaction(
    id: string,
    data: Partial<InsertTransaction>
  ): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  getTransactionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]>;
  getTransactionsByShift(shift: string): Promise<Transaction[]>;

  // Cash Flow operations
  createCashFlow(data: InsertCashFlow): Promise<CashFlow>;
  getCashFlows(): Promise<CashFlow[]>;
  getCashFlow(id: string): Promise<CashFlow | undefined>;
  updateCashFlow(
    id: string,
    data: Partial<InsertCashFlow>
  ): Promise<CashFlow>;
  deleteCashFlow(id: string): Promise<void>;
  getCashFlowsByDateRange(startDate: Date, endDate: Date): Promise<CashFlow[]>;
  getCashFlowsByShift(shift: string): Promise<CashFlow[]>;
}

export class DatabaseStorage implements IStorage {
  // Customer operations
  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const result = await db.insert(customers).values(data).returning();
    return result[0];
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    return result[0];
  }

  async updateCustomer(
    id: string,
    data: Partial<InsertCustomer>
  ): Promise<Customer> {
    const result = await db
      .update(customers)
      .set(data)
      .where(eq(customers.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomer(id: string): Promise<void> {
    await db
      .delete(customers)
      .where(eq(customers.id, id));
  }

  // Supplier operations
  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const result = await db.insert(suppliers).values(data).returning();
    return result[0];
  }

  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const result = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, id));
    return result[0];
  }

  async updateSupplier(
    id: string,
    data: Partial<InsertSupplier>
  ): Promise<Supplier> {
    const result = await db
      .update(suppliers)
      .set(data)
      .where(eq(suppliers.id, id))
      .returning();
    return result[0];
  }

  async deleteSupplier(id: string): Promise<void> {
    await db
      .delete(suppliers)
      .where(eq(suppliers.id, id));
  }

  // Category operations
  async createCategory(data: InsertCategory): Promise<Category> {
    try {
      console.log("Database Insert - Category Data:", data);
      const [newCategory] = await db.insert(categories).values(data).returning();
      if (!newCategory) {
        throw new Error("Falha ao inserir categoria: nenhum registro retornado");
      }
      return newCategory;
    } catch (error) {
      console.error("Database Insert Error (createCategory):", error);
      throw error;
    }
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return result[0];
  }

  async updateCategory(
    id: string,
    data: Partial<InsertCategory>
  ): Promise<Category> {
    const result = await db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  }

  async deleteCategory(id: string): Promise<void> {
    await db
      .delete(categories)
      .where(eq(categories.id, id));
  }

  // Transaction operations
  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(data).returning();
    return result[0];
  }

  async getTransactions(): Promise<(Transaction & { category?: string })[]> {
    const result = await db.select({
      ...transactions,
      category: categories.name
    }).from(transactions).leftJoin(categories, eq(transactions.categoryId, categories.id)) as any[];
    return result.map(t => ({
      ...t,
      category: t.category || 'Sem Categoria'
    }));
  }

  async getTransaction(id: string): Promise<(Transaction & { category?: string }) | undefined> {
    const result = await db.select({
      ...transactions,
      category: categories.name
    }).from(transactions).leftJoin(categories, eq(transactions.categoryId, categories.id)).where(eq(transactions.id, id)) as any[];
    if (!result[0]) return undefined;
    return {
      ...result[0],
      category: result[0].category || 'Sem Categoria'
    };
  }

  async updateTransaction(
    id: string,
    data: Partial<InsertTransaction>
  ): Promise<Transaction> {
    const result = await db
      .update(transactions)
      .set(data)
      .where(eq(transactions.id, id))
      .returning();
    return result[0];
  }

  async deleteTransaction(id: string): Promise<void> {
    await db
      .delete(transactions)
      .where(eq(transactions.id, id));
  }

  async getTransactionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(and(gte(transactions.date, startDate), lte(transactions.date, endDate)));
  }

  async getTransactionsByShift(shift: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.shift, shift));
  }

  // Cash Flow operations
  async createCashFlow(data: InsertCashFlow): Promise<CashFlow> {
    const result = await db.insert(cashFlow).values(data).returning();
    return result[0];
  }

  async getCashFlows(): Promise<CashFlow[]> {
    return await db.select().from(cashFlow);
  }

  async getCashFlow(id: string): Promise<CashFlow | undefined> {
    const result = await db
      .select()
      .from(cashFlow)
      .where(eq(cashFlow.id, id));
    return result[0];
  }

  async updateCashFlow(
    id: string,
    data: Partial<InsertCashFlow>
  ): Promise<CashFlow> {
    const result = await db
      .update(cashFlow)
      .set(data)
      .where(eq(cashFlow.id, id))
      .returning();
    return result[0];
  }

  async deleteCashFlow(id: string): Promise<void> {
    await db
      .delete(cashFlow)
      .where(eq(cashFlow.id, id));
  }

  async getCashFlowsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<CashFlow[]> {
    return await db
      .select()
      .from(cashFlow)
      .where(and(gte(cashFlow.date, startDate), lte(cashFlow.date, endDate)));
  }

  async getCashFlowsByShift(shift: string): Promise<CashFlow[]> {
    return await db
      .select()
      .from(cashFlow)
      .where(eq(cashFlow.shift, shift));
  }
}

export const storage = new DatabaseStorage();
