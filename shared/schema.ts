import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const DEFAULT_CATEGORIES = [
  { name: "Vendas", type: "entrada" },
  { name: "Compras", type: "saida" },
  { name: "Devolução", type: "entrada" },
  { name: "Ajuste", type: "saida" },
  { name: "Pagamento", type: "saida" }
];

// ========== MULTI-TENANT CORE TABLES ==========

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  document: text("document").notNull().unique(),
  subscriptionStatus: text("subscription_status").notNull().default("active"), // active, suspended, cancelled
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Users table with RBAC support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  email: text("email"),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").notNull().default("user"), // admin, manager, user
  status: text("status").notNull().default("active"), // active, inactive, suspended
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Sessions for JWT tracking
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// ========== DATA TABLES WITH MULTI-TENANCY ==========

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contact: text("contact"),
  email: text("email"),
  phone: text("phone"),
  category: text("category"),
  status: text("status").notNull().default("ativo"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contact: text("contact"),
  email: text("email"),
  phone: text("phone"),
  cnpj: text("cnpj"),
  category: text("category"),
  paymentTerms: text("payment_terms"),
  status: text("status").notNull().default("ativo"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // "entrada" or "saida"
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => customers.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  categoryId: varchar("category_id").references(() => categories.id),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }),
  interest: decimal("interest", { precision: 15, scale: 2 }).default("0"),
  paymentDate: timestamp("payment_date"),
  description: text("description"),
  date: timestamp("date").notNull(),
  shift: text("shift").notNull(),
  status: text("status").notNull().default("pendente"),
  installmentGroup: text("installment_group"),
  installmentNumber: integer("installment_number"),
  installmentTotal: integer("installment_total"),
});

export const cashFlow = pgTable("cash_flow", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  inflow: decimal("inflow", { precision: 15, scale: 2 }).notNull().default("0"),
  outflow: decimal("outflow", { precision: 15, scale: 2 }).notNull().default("0"),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  shift: text("shift").notNull(),
});

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => customers.id),
  saleDate: timestamp("sale_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0"),
  installmentCount: integer("installment_count").default(1),
  status: text("status").notNull().default("pendente"),
});

export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  purchaseDate: timestamp("purchase_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0"),
  installmentCount: integer("installment_count").default(1),
  status: text("status").notNull().default("pendente"),
});

export const installments = pgTable("installments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  saleId: varchar("sale_id").references(() => sales.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  paid: boolean("paid").default(false),
  paidDate: timestamp("paid_date"),
});

export const purchaseInstallments = pgTable("purchase_installments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  purchaseId: varchar("purchase_id").references(() => purchases.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  paid: boolean("paid").default(false),
  paidDate: timestamp("paid_date"),
});

// ========== SCHEMAS FOR VALIDATION ==========

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
});

export const insertCashFlowSchema = createInsertSchema(cashFlow).omit({
  id: true,
});

// ========== TYPES ==========

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Session = typeof sessions.$inferSelect;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type CashFlow = typeof cashFlow.$inferSelect;
export type InsertCashFlow = z.infer<typeof insertCashFlowSchema>;

export type InsertSale = typeof sales.$inferInsert;
export type Sale = typeof sales.$inferSelect;

export type InsertPurchase = typeof purchases.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;

export type InsertInstallment = typeof installments.$inferInsert;
export type Installment = typeof installments.$inferSelect;

export type InsertPurchaseInstallment = typeof purchaseInstallments.$inferInsert;
export type PurchaseInstallment = typeof purchaseInstallments.$inferSelect;

// Auth types
export type AuthResponse = {
  user: User;
  token: string;
  company: Company;
};

export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager", 
  USER: "user",
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];
