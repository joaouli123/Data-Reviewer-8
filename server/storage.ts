import { db } from "./db";
import { eq, and, gte, lte, sql, desc, sum } from "drizzle-orm";
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
  companies,
  subscriptions,
  auditLogs,
  users,
  invitations,
  bankStatementItems,
  type BankStatementItem,
  type InsertBankStatementItem,
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
  type Company,
  type Subscription,
  type AuditLog,
  type InsertSubscription,
  type InsertAuditLog,
  type User,
  type InsertUser,
  type Invitation,
  type InsertInvitation,
} from "../shared/schema";

export interface IStorage {
  // Customer operations
  createCustomer(companyId: string, data: InsertCustomer): Promise<Customer>;
  getCustomers(companyId: string): Promise<Customer[]>;
  getCustomer(companyId: string, id: string): Promise<Customer | undefined>;
  updateCustomer(companyId: string, id: string, data: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(companyId: string, id: string): Promise<void>;

  // Supplier operations
  createSupplier(companyId: string, data: InsertSupplier): Promise<Supplier>;
  getSuppliers(companyId: string): Promise<Supplier[]>;
  getSupplier(companyId: string, id: string): Promise<Supplier | undefined>;
  updateSupplier(companyId: string, id: string, data: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(companyId: string, id: string): Promise<void>;

  // Category operations
  createCategory(companyId: string, data: InsertCategory): Promise<Category>;
  getCategories(companyId: string): Promise<Category[]>;
  getCategory(companyId: string, id: string): Promise<Category | undefined>;
  updateCategory(companyId: string, id: string, data: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(companyId: string, id: string): Promise<void>;

  // Transaction operations
  createTransaction(companyId: string, data: InsertTransaction): Promise<Transaction>;
  getTransactions(companyId: string): Promise<Transaction[]>;
  getTransaction(companyId: string, id: string): Promise<Transaction | undefined>;
  updateTransaction(companyId: string, id: string, data: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(companyId: string, id: string): Promise<void>;
  getTransactionsByDateRange(companyId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getTransactionsByShift(companyId: string, shift: string): Promise<Transaction[]>;

  // Cash Flow operations
  createCashFlow(companyId: string, data: InsertCashFlow): Promise<CashFlow>;
  getCashFlows(companyId: string): Promise<CashFlow[]>;
  getCashFlow(companyId: string, id: string): Promise<CashFlow | undefined>;
  updateCashFlow(companyId: string, id: string, data: Partial<InsertCashFlow>): Promise<CashFlow>;
  deleteCashFlow(companyId: string, id: string): Promise<void>;
  getCashFlowsByDateRange(companyId: string, startDate: Date, endDate: Date): Promise<CashFlow[]>;
  getCashFlowsByShift(companyId: string, shift: string): Promise<CashFlow[]>;

  // Sale operations
  createSale(companyId: string, data: InsertSale): Promise<Sale>;
  getSales(companyId: string): Promise<Sale[]>;
  getSale(companyId: string, id: string): Promise<Sale | undefined>;
  updateSale(companyId: string, id: string, data: Partial<InsertSale>): Promise<Sale>;
  deleteSale(companyId: string, id: string): Promise<void>;

  // Purchase operations
  createPurchase(companyId: string, data: InsertPurchase): Promise<Purchase>;
  getPurchases(companyId: string): Promise<Purchase[]>;
  getPurchase(companyId: string, id: string): Promise<Purchase | undefined>;
  updatePurchase(companyId: string, id: string, data: Partial<InsertPurchase>): Promise<Purchase>;
  deletePurchase(companyId: string, id: string): Promise<void>;

  // Installment operations
  createInstallment(companyId: string, data: InsertInstallment): Promise<Installment>;
  getInstallments(companyId: string): Promise<Installment[]>;
  getInstallment(companyId: string, id: string): Promise<Installment | undefined>;
  updateInstallment(companyId: string, id: string, data: Partial<InsertInstallment>): Promise<Installment>;
  deleteInstallment(companyId: string, id: string): Promise<void>;

  // Purchase Installment operations
  createPurchaseInstallment(companyId: string, data: InsertPurchaseInstallment): Promise<PurchaseInstallment>;
  getPurchaseInstallments(companyId: string): Promise<PurchaseInstallment[]>;
  getPurchaseInstallment(companyId: string, id: string): Promise<PurchaseInstallment | undefined>;
  updatePurchaseInstallment(companyId: string, id: string, data: Partial<InsertPurchaseInstallment>): Promise<PurchaseInstallment>;
  deletePurchaseInstallment(companyId: string, id: string): Promise<void>;

  // Subscription operations
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  updateCompanySubscription(companyId: string, data: Partial<InsertSubscription>): Promise<Subscription>;
  getCompanySubscription(companyId: string): Promise<Subscription | undefined>;
  
  // User operations
  getUsers(companyId: string): Promise<User[]>;
  getUser(companyId: string, id: string): Promise<User | undefined>;
  updateUserPermissions(companyId: string, userId: string, permissions: Record<string, boolean>): Promise<User>;
  updateUser(companyId: string, userId: string, data: Partial<InsertUser>): Promise<User>;
  deleteUser(companyId: string, userId: string): Promise<void>;
  
  // Invitation operations
  createInvitation(companyId: string, createdBy: string, data: InsertInvitation): Promise<Invitation>;
  getInvitations(companyId: string): Promise<Invitation[]>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  acceptInvitation(token: string, userId: string): Promise<User>;
  deleteInvitation(token: string): Promise<void>;
  
  // Audit log operations
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(companyId: string, limit?: number): Promise<AuditLog[]>;

  // Bank Statement operations
  getBankStatementItems(companyId: string): Promise<BankStatementItem[]>;
  createBankStatementItem(companyId: string, data: InsertBankStatementItem): Promise<BankStatementItem>;
  updateBankStatementItem(companyId: string, id: string, data: Partial<InsertBankStatementItem>): Promise<BankStatementItem>;
  matchBankStatementItem(companyId: string, bankItemId: string, transactionId: string): Promise<BankStatementItem>;
  clearBankStatementItems(companyId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Customer operations
  async createCustomer(companyId: string, data: InsertCustomer): Promise<Customer> {
    const result = await db.insert(customers).values({ ...data, companyId }).returning();
    return result[0];
  }

  async getCustomers(companyId: string): Promise<(Customer & { totalSales: number })[]> {
    // Get all customers with their total sales calculated in real-time via SQL aggregation
    const result = await db
      .select({
        id: customers.id,
        companyId: customers.companyId,
        name: customers.name,
        cnpj: customers.cnpj,
        email: customers.email,
        phone: customers.phone,
        contact: customers.contact,
        category: customers.category,
        status: customers.status,
        createdAt: customers.createdAt,
        totalSales: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('income', 'venda') THEN ${transactions.amount} ELSE 0 END), 0)`.mapWith(Number),
      })
      .from(customers)
      .leftJoin(transactions, eq(transactions.customerId, customers.id))
      .where(eq(customers.companyId, companyId))
      .groupBy(customers.id)
      .orderBy(desc(customers.createdAt));
    
    return result as (Customer & { totalSales: number })[];
  }

  async getCustomer(companyId: string, id: string): Promise<Customer | undefined> {
    const result = await db
      .select()
      .from(customers)
      .where(and(eq(customers.companyId, companyId), eq(customers.id, id)));
    return result[0];
  }

  async updateCustomer(companyId: string, id: string, data: Partial<InsertCustomer>): Promise<Customer> {
    const result = await db
      .update(customers)
      .set(data)
      .where(and(eq(customers.companyId, companyId), eq(customers.id, id)))
      .returning();
    return result[0];
  }

  async deleteCustomer(companyId: string, id: string): Promise<void> {
    // Delete related transactions first (sales/income for this customer)
    await db
      .delete(transactions)
      .where(and(eq(transactions.companyId, companyId), eq(transactions.customerId, id)));
    
    // Then delete the customer
    await db
      .delete(customers)
      .where(and(eq(customers.companyId, companyId), eq(customers.id, id)));
  }

  // Supplier operations
  async createSupplier(companyId: string, data: InsertSupplier): Promise<Supplier> {
    const result = await db.insert(suppliers).values({ ...data, companyId }).returning();
    return result[0];
  }

  async getSuppliers(companyId: string): Promise<Supplier[]> {
    // Get all suppliers with their basic info
    return await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.companyId, companyId))
      .orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(companyId: string, id: string): Promise<Supplier | undefined> {
    const result = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.companyId, companyId), eq(suppliers.id, id)));
    return result[0];
  }

  async updateSupplier(companyId: string, id: string, data: Partial<InsertSupplier>): Promise<Supplier> {
    const result = await db
      .update(suppliers)
      .set(data)
      .where(and(eq(suppliers.companyId, companyId), eq(suppliers.id, id)))
      .returning();
    return result[0];
  }

  async deleteSupplier(companyId: string, id: string): Promise<void> {
    // Delete related transactions first (purchases for this supplier)
    await db
      .delete(transactions)
      .where(and(eq(transactions.companyId, companyId), eq(transactions.supplierId, id)));
    
    // Then delete the supplier
    await db
      .delete(suppliers)
      .where(and(eq(suppliers.companyId, companyId), eq(suppliers.id, id)));
  }

  // Category operations
  async createCategory(companyId: string, data: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values({ ...data, companyId }).returning();
    if (!result[0]) throw new Error("Failed to create category");
    return result[0];
  }

  async getCategories(companyId: string): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.companyId, companyId));
  }

  async getCategory(companyId: string, id: string): Promise<Category | undefined> {
    const result = await db
      .select()
      .from(categories)
      .where(and(eq(categories.companyId, companyId), eq(categories.id, id)));
    return result[0];
  }

  async updateCategory(companyId: string, id: string, data: Partial<InsertCategory>): Promise<Category> {
    const result = await db
      .update(categories)
      .set(data)
      .where(and(eq(categories.companyId, companyId), eq(categories.id, id)))
      .returning();
    return result[0];
  }

  async deleteCategory(companyId: string, id: string): Promise<void> {
    await db
      .delete(categories)
      .where(and(eq(categories.companyId, companyId), eq(categories.id, id)));
  }

  // Transaction operations
  async createTransaction(companyId: string, data: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values({ ...data, companyId }).returning();
    return result[0];
  }

  async getTransactions(companyId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.companyId, companyId));
  }

  async getTransaction(companyId: string, id: string): Promise<Transaction | undefined> {
    const result = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.companyId, companyId), eq(transactions.id, id)));
    return result[0];
  }

  async updateTransaction(companyId: string, id: string, data: Partial<InsertTransaction>): Promise<Transaction> {
    const result = await db
      .update(transactions)
      .set(data)
      .where(and(eq(transactions.companyId, companyId), eq(transactions.id, id)))
      .returning();
    return result[0];
  }

  async deleteTransaction(companyId: string, id: string): Promise<void> {
    await db
      .delete(transactions)
      .where(and(eq(transactions.companyId, companyId), eq(transactions.id, id)));
  }

  async getTransactionsByDateRange(companyId: string, startDate: Date, endDate: Date): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.companyId, companyId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );
  }

  async getTransactionsByShift(companyId: string, shift: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.companyId, companyId), eq(transactions.shift, shift)));
  }

  // Cash Flow operations
  async createCashFlow(companyId: string, data: InsertCashFlow): Promise<CashFlow> {
    const result = await db.insert(cashFlow).values({ ...data, companyId }).returning();
    return result[0];
  }

  async getCashFlows(companyId: string): Promise<CashFlow[]> {
    return await db
      .select()
      .from(cashFlow)
      .where(eq(cashFlow.companyId, companyId));
  }

  async getCashFlow(companyId: string, id: string): Promise<CashFlow | undefined> {
    const result = await db
      .select()
      .from(cashFlow)
      .where(and(eq(cashFlow.companyId, companyId), eq(cashFlow.id, id)));
    return result[0];
  }

  async updateCashFlow(companyId: string, id: string, data: Partial<InsertCashFlow>): Promise<CashFlow> {
    const result = await db
      .update(cashFlow)
      .set(data)
      .where(and(eq(cashFlow.companyId, companyId), eq(cashFlow.id, id)))
      .returning();
    return result[0];
  }

  async deleteCashFlow(companyId: string, id: string): Promise<void> {
    await db
      .delete(cashFlow)
      .where(and(eq(cashFlow.companyId, companyId), eq(cashFlow.id, id)));
  }

  async getCashFlowsByDateRange(companyId: string, startDate: Date, endDate: Date): Promise<CashFlow[]> {
    return await db
      .select()
      .from(cashFlow)
      .where(
        and(
          eq(cashFlow.companyId, companyId),
          gte(cashFlow.date, startDate),
          lte(cashFlow.date, endDate)
        )
      );
  }

  async getCashFlowsByShift(companyId: string, shift: string): Promise<CashFlow[]> {
    return await db
      .select()
      .from(cashFlow)
      .where(and(eq(cashFlow.companyId, companyId), eq(cashFlow.shift, shift)));
  }

  // Sale operations
  async createSale(companyId: string, data: InsertSale): Promise<Sale> {
    const result = await db.insert(sales).values({ ...data, companyId }).returning();
    return result[0];
  }

  async getSales(companyId: string): Promise<Sale[]> {
    return await db
      .select()
      .from(sales)
      .where(eq(sales.companyId, companyId));
  }

  async getSale(companyId: string, id: string): Promise<Sale | undefined> {
    const result = await db
      .select()
      .from(sales)
      .where(and(eq(sales.companyId, companyId), eq(sales.id, id)));
    return result[0];
  }

  async updateSale(companyId: string, id: string, data: Partial<InsertSale>): Promise<Sale> {
    const result = await db
      .update(sales)
      .set(data)
      .where(and(eq(sales.companyId, companyId), eq(sales.id, id)))
      .returning();
    return result[0];
  }

  async deleteSale(companyId: string, id: string): Promise<void> {
    await db
      .delete(sales)
      .where(and(eq(sales.companyId, companyId), eq(sales.id, id)));
  }

  // Purchase operations
  async createPurchase(companyId: string, data: InsertPurchase): Promise<Purchase> {
    const result = await db.insert(purchases).values({ ...data, companyId }).returning();
    return result[0];
  }

  async getPurchases(companyId: string): Promise<Purchase[]> {
    return await db
      .select()
      .from(purchases)
      .where(eq(purchases.companyId, companyId));
  }

  async getPurchase(companyId: string, id: string): Promise<Purchase | undefined> {
    const result = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.companyId, companyId), eq(purchases.id, id)));
    return result[0];
  }

  async updatePurchase(companyId: string, id: string, data: Partial<InsertPurchase>): Promise<Purchase> {
    const result = await db
      .update(purchases)
      .set(data)
      .where(and(eq(purchases.companyId, companyId), eq(purchases.id, id)))
      .returning();
    return result[0];
  }

  async deletePurchase(companyId: string, id: string): Promise<void> {
    await db
      .delete(purchases)
      .where(and(eq(purchases.companyId, companyId), eq(purchases.id, id)));
  }

  // Installment operations
  async createInstallment(companyId: string, data: InsertInstallment): Promise<Installment> {
    const result = await db.insert(installments).values({ ...data, companyId }).returning();
    return result[0];
  }

  async getInstallments(companyId: string): Promise<Installment[]> {
    return await db
      .select()
      .from(installments)
      .where(eq(installments.companyId, companyId));
  }

  async getInstallment(companyId: string, id: string): Promise<Installment | undefined> {
    const result = await db
      .select()
      .from(installments)
      .where(and(eq(installments.companyId, companyId), eq(installments.id, id)));
    return result[0];
  }

  async updateInstallment(companyId: string, id: string, data: Partial<InsertInstallment>): Promise<Installment> {
    const result = await db
      .update(installments)
      .set(data)
      .where(and(eq(installments.companyId, companyId), eq(installments.id, id)))
      .returning();
    return result[0];
  }

  async deleteInstallment(companyId: string, id: string): Promise<void> {
    await db
      .delete(installments)
      .where(and(eq(installments.companyId, companyId), eq(installments.id, id)));
  }

  // Purchase Installment operations
  async createPurchaseInstallment(companyId: string, data: InsertPurchaseInstallment): Promise<PurchaseInstallment> {
    const result = await db.insert(purchaseInstallments).values({ ...data, companyId }).returning();
    return result[0];
  }

  async getPurchaseInstallments(companyId: string): Promise<PurchaseInstallment[]> {
    return await db
      .select()
      .from(purchaseInstallments)
      .where(eq(purchaseInstallments.companyId, companyId));
  }

  async getPurchaseInstallment(companyId: string, id: string): Promise<PurchaseInstallment | undefined> {
    const result = await db
      .select()
      .from(purchaseInstallments)
      .where(and(eq(purchaseInstallments.companyId, companyId), eq(purchaseInstallments.id, id)));
    return result[0];
  }

  async updatePurchaseInstallment(companyId: string, id: string, data: Partial<InsertPurchaseInstallment>): Promise<PurchaseInstallment> {
    const result = await db
      .update(purchaseInstallments)
      .set(data)
      .where(and(eq(purchaseInstallments.companyId, companyId), eq(purchaseInstallments.id, id)))
      .returning();
    return result[0];
  }

  async deletePurchaseInstallment(companyId: string, id: string): Promise<void> {
    await db
      .delete(purchaseInstallments)
      .where(and(eq(purchaseInstallments.companyId, companyId), eq(purchaseInstallments.id, id)));
  }

  // Subscription operations
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.id, id));
    return result[0];
  }

  async updateCompanySubscription(companyId: string, data: Partial<InsertSubscription>): Promise<Subscription> {
    const result = await db
      .update(subscriptions)
      .set(data)
      .where(eq(subscriptions.companyId, companyId))
      .returning();
    return result[0];
  }

  async getCompanySubscription(companyId: string): Promise<Subscription | undefined> {
    const result = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.companyId, companyId));
    return result[0];
  }

  // Audit log operations
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLogs).values(data).returning();
    return result[0];
  }

  async getAuditLogs(companyId: string, limit: number = 100): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.companyId, companyId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // User operations
  async getUsers(companyId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.companyId, companyId));
  }

  async getUser(companyId: string, id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(and(eq(users.companyId, companyId), eq(users.id, id)));
    return result[0];
  }

  async updateUserPermissions(companyId: string, userId: string, permissions: Record<string, boolean>): Promise<User> {
    const result = await db.update(users).set({ permissions: JSON.stringify(permissions) }).where(and(eq(users.companyId, companyId), eq(users.id, userId))).returning();
    return result[0];
  }

  async updateUser(companyId: string, userId: string, data: Partial<InsertUser>): Promise<User> {
    const result = await db.update(users).set(data).where(and(eq(users.companyId, companyId), eq(users.id, userId))).returning();
    return result[0];
  }

  async deleteUser(companyId: string, userId: string): Promise<void> {
    await db.delete(users).where(and(eq(users.companyId, companyId), eq(users.id, userId)));
  }

  // Invitation operations
  async createInvitation(companyId: string, createdBy: string, data: InsertInvitation): Promise<Invitation> {
    const token = require('crypto').randomBytes(32).toString('hex');
    const result = await db.insert(invitations).values({ ...data, companyId, token, createdBy }).returning();
    return result[0];
  }

  async getInvitations(companyId: string): Promise<Invitation[]> {
    return await db.select().from(invitations).where(eq(invitations.companyId, companyId));
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const result = await db.select().from(invitations).where(eq(invitations.token, token));
    return result[0];
  }

  async acceptInvitation(token: string, userId: string): Promise<User> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) throw new Error('Invalid invitation');
    await db.update(invitations).set({ acceptedAt: new Date(), acceptedBy: userId }).where(eq(invitations.token, token));
    return (await db.select().from(users).where(eq(users.id, userId)))[0];
  }

  async deleteInvitation(token: string): Promise<void> {
    await db.delete(invitations).where(eq(invitations.token, token));
  }

  // Bank Statement operations
  async getBankStatementItems(companyId: string): Promise<BankStatementItem[]> {
    return await db
      .select()
      .from(bankStatementItems)
      .where(eq(bankStatementItems.companyId, companyId))
      .orderBy(desc(bankStatementItems.date));
  }

  async createBankStatementItem(companyId: string, data: InsertBankStatementItem): Promise<BankStatementItem> {
    const [item] = await db
      .insert(bankStatementItems)
      .values({ ...data, companyId })
      .returning();
    return item;
  }

  async updateBankStatementItem(companyId: string, id: string, data: Partial<InsertBankStatementItem>): Promise<BankStatementItem> {
    const [item] = await db
      .update(bankStatementItems)
      .set(data)
      .where(and(eq(bankStatementItems.companyId, companyId), eq(bankStatementItems.id, id)))
      .returning();
    return item;
  }

  async matchBankStatementItem(companyId: string, bankItemId: string, transactionId: string): Promise<BankStatementItem> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .update(bankStatementItems)
        .set({ 
          status: "RECONCILED", 
          transactionId 
        })
        .where(and(eq(bankStatementItems.companyId, companyId), eq(bankStatementItems.id, bankItemId)))
        .returning();

      await tx
        .update(transactions)
        .set({ isReconciled: true })
        .where(and(eq(transactions.companyId, companyId), eq(transactions.id, transactionId)));

      return result[0];
    });
  }

  async clearBankStatementItems(companyId: string): Promise<void> {
    await db.delete(bankStatementItems).where(eq(bankStatementItems.companyId, companyId));
  }
}

export const storage = new DatabaseStorage();
