import { db } from "./db";
import {
  customers,
  suppliers,
  transactions,
  cashFlow,
  type InsertCustomer,
  type InsertSupplier,
  type InsertTransaction,
  type InsertCashFlow,
  type Customer,
  type Supplier,
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
    return await db.select().from(customers);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db
      .select()
      .from(customers)
      .where((c) => c.id === id);
    return result[0];
  }

  async updateCustomer(
    id: string,
    data: Partial<InsertCustomer>
  ): Promise<Customer> {
    const result = await db
      .update(customers)
      .set(data)
      .where((c) => c.id === id)
      .returning();
    return result[0];
  }

  async deleteCustomer(id: string): Promise<void> {
    await db
      .delete(customers)
      .where((c) => c.id === id);
  }

  // Supplier operations
  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const result = await db.insert(suppliers).values(data).returning();
    return result[0];
  }

  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers);
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const result = await db
      .select()
      .from(suppliers)
      .where((s) => s.id === id);
    return result[0];
  }

  async updateSupplier(
    id: string,
    data: Partial<InsertSupplier>
  ): Promise<Supplier> {
    const result = await db
      .update(suppliers)
      .set(data)
      .where((s) => s.id === id)
      .returning();
    return result[0];
  }

  async deleteSupplier(id: string): Promise<void> {
    await db
      .delete(suppliers)
      .where((s) => s.id === id);
  }

  // Transaction operations
  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(data).returning();
    return result[0];
  }

  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const result = await db
      .select()
      .from(transactions)
      .where((t) => t.id === id);
    return result[0];
  }

  async updateTransaction(
    id: string,
    data: Partial<InsertTransaction>
  ): Promise<Transaction> {
    const result = await db
      .update(transactions)
      .set(data)
      .where((t) => t.id === id)
      .returning();
    return result[0];
  }

  async deleteTransaction(id: string): Promise<void> {
    await db
      .delete(transactions)
      .where((t) => t.id === id);
  }

  async getTransactionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where((t) => t.date >= startDate && t.date <= endDate);
  }

  async getTransactionsByShift(shift: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where((t) => t.shift === shift);
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
      .where((cf) => cf.id === id);
    return result[0];
  }

  async updateCashFlow(
    id: string,
    data: Partial<InsertCashFlow>
  ): Promise<CashFlow> {
    const result = await db
      .update(cashFlow)
      .set(data)
      .where((cf) => cf.id === id)
      .returning();
    return result[0];
  }

  async deleteCashFlow(id: string): Promise<void> {
    await db
      .delete(cashFlow)
      .where((cf) => cf.id === id);
  }

  async getCashFlowsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<CashFlow[]> {
    return await db
      .select()
      .from(cashFlow)
      .where((cf) => cf.date >= startDate && cf.date <= endDate);
  }

  async getCashFlowsByShift(shift: string): Promise<CashFlow[]> {
    return await db
      .select()
      .from(cashFlow)
      .where((cf) => cf.shift === shift);
  }
}

export const storage = new DatabaseStorage();
