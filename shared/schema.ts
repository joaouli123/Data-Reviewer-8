import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  timestamp,
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

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contact: text("contact"),
  email: text("email"),
  phone: text("phone"),
  status: text("status").notNull().default("ativo"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contact: text("contact"),
  email: text("email"),
  phone: text("phone"),
  paymentTerms: text("payment_terms"),
  status: text("status").notNull().default("ativo"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // "entrada" or "saida"
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  categoryId: varchar("category_id").references(() => categories.id),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  shift: text("shift").notNull(),
  status: text("status").notNull().default("pendente"),
});

export const cashFlow = pgTable("cash_flow", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  inflow: decimal("inflow", { precision: 15, scale: 2 }).notNull().default("0"),
  outflow: decimal("outflow", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  shift: text("shift").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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

export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({
    id: true,
  })
  .transform((data) => ({
    ...data,
    date: data.date instanceof Date ? data.date : new Date(String(data.date))
  }));

export const insertCashFlowSchema = createInsertSchema(cashFlow).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertCashFlow = z.infer<typeof insertCashFlowSchema>;
export type CashFlow = typeof cashFlow.$inferSelect;
