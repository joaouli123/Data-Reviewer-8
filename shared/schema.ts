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

// Permissões granulares disponíveis
export const PERMISSIONS = {
  // Transações
  VIEW_TRANSACTIONS: "view_transactions",
  CREATE_TRANSACTIONS: "create_transactions",
  EDIT_TRANSACTIONS: "edit_transactions",
  DELETE_TRANSACTIONS: "delete_transactions",
  IMPORT_BANK: "import_bank",
  
  // Relatórios
  VIEW_REPORTS: "view_reports",
  VIEW_PROFIT: "view_profit",
  EXPORT_REPORTS: "export_reports",
  
  // Clientes
  VIEW_CUSTOMERS: "view_customers",
  MANAGE_CUSTOMERS: "manage_customers",
  
  // Fornecedores
  VIEW_SUPPLIERS: "view_suppliers",
  MANAGE_SUPPLIERS: "manage_suppliers",
  
  // Usuários
  MANAGE_USERS: "manage_users",
  INVITE_USERS: "invite_users",
  
  // Configurações
  VIEW_SETTINGS: "view_settings",
  MANAGE_SETTINGS: "manage_settings",
} as const;

export const DEFAULT_PERMISSIONS = {
  admin: {
    [PERMISSIONS.VIEW_TRANSACTIONS]: true,
    [PERMISSIONS.CREATE_TRANSACTIONS]: true,
    [PERMISSIONS.EDIT_TRANSACTIONS]: true,
    [PERMISSIONS.DELETE_TRANSACTIONS]: true,
    [PERMISSIONS.IMPORT_BANK]: true,
    [PERMISSIONS.VIEW_REPORTS]: true,
    [PERMISSIONS.VIEW_PROFIT]: true,
    [PERMISSIONS.EXPORT_REPORTS]: true,
    [PERMISSIONS.VIEW_CUSTOMERS]: true,
    [PERMISSIONS.MANAGE_CUSTOMERS]: true,
    [PERMISSIONS.VIEW_SUPPLIERS]: true,
    [PERMISSIONS.MANAGE_SUPPLIERS]: true,
    [PERMISSIONS.MANAGE_USERS]: true,
    [PERMISSIONS.INVITE_USERS]: true,
    [PERMISSIONS.VIEW_SETTINGS]: true,
    [PERMISSIONS.MANAGE_SETTINGS]: true,
  },
  manager: {
    [PERMISSIONS.VIEW_TRANSACTIONS]: true,
    [PERMISSIONS.CREATE_TRANSACTIONS]: true,
    [PERMISSIONS.EDIT_TRANSACTIONS]: true,
    [PERMISSIONS.IMPORT_BANK]: true,
    [PERMISSIONS.VIEW_REPORTS]: true,
    [PERMISSIONS.VIEW_PROFIT]: true,
    [PERMISSIONS.EXPORT_REPORTS]: true,
    [PERMISSIONS.VIEW_CUSTOMERS]: true,
    [PERMISSIONS.MANAGE_CUSTOMERS]: true,
    [PERMISSIONS.VIEW_SUPPLIERS]: true,
    [PERMISSIONS.MANAGE_SUPPLIERS]: true,
    [PERMISSIONS.VIEW_SETTINGS]: false,
    [PERMISSIONS.MANAGE_SETTINGS]: false,
    [PERMISSIONS.MANAGE_USERS]: false,
    [PERMISSIONS.INVITE_USERS]: false,
  },
  user: {
    [PERMISSIONS.VIEW_TRANSACTIONS]: true,
    [PERMISSIONS.CREATE_TRANSACTIONS]: true,
    [PERMISSIONS.VIEW_REPORTS]: true,
    [PERMISSIONS.EXPORT_REPORTS]: true,
    [PERMISSIONS.VIEW_CUSTOMERS]: true,
    [PERMISSIONS.VIEW_SUPPLIERS]: true,
  },
  operational: {
    [PERMISSIONS.VIEW_TRANSACTIONS]: true,
    [PERMISSIONS.CREATE_TRANSACTIONS]: true,
    [PERMISSIONS.IMPORT_BANK]: true,
  },
} as const;

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

// Subscriptions table - tracks company plans
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("basic"), // basic, pro, enterprise
  status: text("status").notNull().default("active"), // active, suspended, cancelled, blocked
  subscriberName: text("subscriber_name"), // Name of the person who purchased
  paymentMethod: text("payment_method"), // credit_card, debit_card, bank_transfer, pix, etc
  amount: decimal("amount", { precision: 15, scale: 2 }), // Subscription value
  isLifetime: boolean("is_lifetime").default(false), // If true, no expiration
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Users table with RBAC support and Super Admin flag
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }), // NULL for super admin
  username: text("username").notNull(),
  email: text("email"),
  password: text("password").notNull(),
  name: text("name"),
  phone: text("phone"),
  avatar: text("avatar"), // URL to avatar image
  role: text("role").notNull().default("user"), // admin, manager, user, operational
  isSuperAdmin: boolean("is_super_admin").notNull().default(false), // Flag for Super Admin
  permissions: text("permissions").default(sql`'{}'::jsonb`), // JSON: {view_reports: true, manage_transactions: true, ...}
  status: text("status").notNull().default("active"), // active, inactive, suspended
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Invitations table for user onboarding
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(), // Unique invite token
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  permissions: text("permissions").default(sql`'{}'::jsonb`),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: varchar("accepted_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
});

// Audit logs for security tracking
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // e.g., "CREATE_TRANSACTION", "DELETE_CUSTOMER"
  resourceType: text("resource_type").notNull(), // e.g., "transaction", "customer"
  resourceId: varchar("resource_id"),
  details: text("details"), // JSON string with additional details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("success"), // success, failure
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
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

// Login attempts for rate limiting
export const loginAttempts = pgTable("login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull(),
  username: text("username"),
  success: boolean("success").notNull().default(false),
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
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "cascade" }),
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
  paymentMethod: text("payment_method"),
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
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  saleDate: timestamp("sale_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0"),
  installmentCount: integer("installment_count").default(1),
  status: text("status").notNull().default("pendente"),
});

export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }),
  purchaseDate: timestamp("purchase_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0"),
  installmentCount: integer("installment_count").default(1),
  status: text("status").notNull().default("pendente"),
});

export const installments = pgTable("installments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  saleId: varchar("sale_id").references(() => sales.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  paid: boolean("paid").default(false),
  paidDate: timestamp("paid_date"),
});

export const purchaseInstallments = pgTable("purchase_installments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  purchaseId: varchar("purchase_id").references(() => purchases.id, { onDelete: "cascade" }),
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

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
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

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  acceptedBy: true,
}).extend({
  email: z.string().email("Invalid email"),
  token: z.string().optional(),
  expiresAt: z.date().or(z.string()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  companyId: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  companyId: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  companyId: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  companyId: true,
});

export const insertCashFlowSchema = createInsertSchema(cashFlow).omit({
  id: true,
  companyId: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  companyId: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  companyId: true,
});

export const insertInstallmentSchema = createInsertSchema(installments).omit({
  id: true,
  companyId: true,
});

export const insertPurchaseInstallmentSchema = createInsertSchema(purchaseInstallments).omit({
  id: true,
  companyId: true,
});

// ========== TYPES ==========

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

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

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type LoginAttempt = typeof loginAttempts.$inferSelect;

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
  OPERATIONAL: "operational",
  SUPER_ADMIN: "super_admin",
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];
