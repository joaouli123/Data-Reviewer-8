import { db } from "./db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import {
  customers,
  suppliers,
  categories,
  transactions,
  cashFlow,
  sales,
  purchases,
  installments,
  purchaseInstallments,
  type InsertCustomer,
  type InsertSupplier,
  type InsertCategory,
  type InsertTransaction,
  type InsertCashFlow,
  type InsertSale,
  type InsertPurchase,
  type InsertInstallment,
  type InsertPurchaseInstallment,
  type Customer,
  type Supplier,
  type Category,
  type Transaction,
  type CashFlow,
  type Sale,
  type Purchase,
  type Installment,
  type PurchaseInstallment,
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

  // Sale operations
  createSale(data: InsertSale): Promise<Sale>;
  getSales(): Promise<Sale[]>;
  getSale(id: string): Promise<Sale | undefined>;
  updateSale(id: string, data: Partial<InsertSale>): Promise<Sale>;
  deleteSale(id: string): Promise<void>;

  // Purchase operations
  createPurchase(data: InsertPurchase): Promise<Purchase>;
  getPurchases(): Promise<Purchase[]>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  updatePurchase(id: string, data: Partial<InsertPurchase>): Promise<Purchase>;
  deletePurchase(id: string): Promise<void>;

  // Installment operations
  createInstallment(data: InsertInstallment): Promise<Installment>;
  getInstallments(): Promise<Installment[]>;
  getInstallment(id: string): Promise<Installment | undefined>;
  updateInstallment(id: string, data: Partial<InsertInstallment>): Promise<Installment>;
  deleteInstallment(id: string): Promise<void>;

  // Purchase Installment operations
  createPurchaseInstallment(data: InsertPurchaseInstallment): Promise<PurchaseInstallment>;
  getPurchaseInstallments(): Promise<PurchaseInstallment[]>;
  getPurchaseInstallment(id: string): Promise<PurchaseInstallment | undefined>;
  updatePurchaseInstallment(id: string, data: Partial<InsertPurchaseInstallment>): Promise<PurchaseInstallment>;
  deletePurchaseInstallment(id: string): Promise<void>;
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

  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return result[0];
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

  // Sale operations
  async createSale(data: InsertSale): Promise<Sale> {
    const result = await db.insert(sales).values(data).returning();
    return result[0];
  }

  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales);
  }

  async getSale(id: string): Promise<Sale | undefined> {
    const result = await db.select().from(sales).where(eq(sales.id, id));
    return result[0];
  }

  async updateSale(id: string, data: Partial<InsertSale>): Promise<Sale> {
    const result = await db.update(sales).set(data).where(eq(sales.id, id)).returning();
    return result[0];
  }

  async deleteSale(id: string): Promise<void> {
    await db.delete(sales).where(eq(sales.id, id));
  }

  // Purchase operations
  async createPurchase(data: InsertPurchase): Promise<Purchase> {
    const result = await db.insert(purchases).values(data).returning();
    return result[0];
  }

  async getPurchases(): Promise<Purchase[]> {
    return await db.select().from(purchases);
  }

  async getPurchase(id: string): Promise<Purchase | undefined> {
    const result = await db.select().from(purchases).where(eq(purchases.id, id));
    return result[0];
  }

  async updatePurchase(id: string, data: Partial<InsertPurchase>): Promise<Purchase> {
    const result = await db.update(purchases).set(data).where(eq(purchases.id, id)).returning();
    return result[0];
  }

  async deletePurchase(id: string): Promise<void> {
    await db.delete(purchases).where(eq(purchases.id, id));
  }

  // Installment operations
  async createInstallment(data: InsertInstallment): Promise<Installment> {
    const result = await db.insert(installments).values(data).returning();
    return result[0];
  }

  async getInstallments(): Promise<Installment[]> {
    return await db.select().from(installments);
  }

  async getInstallment(id: string): Promise<Installment | undefined> {
    const result = await db.select().from(installments).where(eq(installments.id, id));
    return result[0];
  }

  async updateInstallment(id: string, data: Partial<InsertInstallment>): Promise<Installment> {
    const result = await db.update(installments).set(data).where(eq(installments.id, id)).returning();
    return result[0];
  }

  async deleteInstallment(id: string): Promise<void> {
    await db.delete(installments).where(eq(installments.id, id));
  }

  // Purchase Installment operations
  async createPurchaseInstallment(data: InsertPurchaseInstallment): Promise<PurchaseInstallment> {
    const result = await db.insert(purchaseInstallments).values(data).returning();
    return result[0];
  }

  async getPurchaseInstallments(): Promise<PurchaseInstallment[]> {
    return await db.select().from(purchaseInstallments);
  }

  async getPurchaseInstallment(id: string): Promise<PurchaseInstallment | undefined> {
    const result = await db.select().from(purchaseInstallments).where(eq(purchaseInstallments.id, id));
    return result[0];
  }

  async updatePurchaseInstallment(id: string, data: Partial<InsertPurchaseInstallment>): Promise<PurchaseInstallment> {
    const result = await db.update(purchaseInstallments).set(data).where(eq(purchaseInstallments.id, id)).returning();
    return result[0];
  }

  async deletePurchaseInstallment(id: string): Promise<void> {
    await db.delete(purchaseInstallments).where(eq(purchaseInstallments.id, id));
  }
}

export const storage = new DatabaseStorage();
