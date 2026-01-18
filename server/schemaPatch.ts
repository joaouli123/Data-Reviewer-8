import { pool } from "./db";

// Runs the minimal DDL required by the app. Safe to call multiple times.
export async function ensureCoreSchema() {
  try {
    await pool.query(`
      ALTER TABLE IF EXISTS customers
        ADD COLUMN IF NOT EXISTS company_id varchar,
        ADD COLUMN IF NOT EXISTS cpf text,
        ADD COLUMN IF NOT EXISTS cnpj text,
        ADD COLUMN IF NOT EXISTS contact text,
        ADD COLUMN IF NOT EXISTS category text,
        ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';

      ALTER TABLE IF EXISTS suppliers
        ADD COLUMN IF NOT EXISTS company_id varchar,
        ADD COLUMN IF NOT EXISTS cpf text,
        ADD COLUMN IF NOT EXISTS cnpj text,
        ADD COLUMN IF NOT EXISTS contact text,
        ADD COLUMN IF NOT EXISTS category text,
        ADD COLUMN IF NOT EXISTS payment_terms text,
        ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';

      ALTER TABLE IF NOT EXISTS transactions
        ADD COLUMN IF NOT EXISTS company_id varchar,
        ADD COLUMN IF NOT EXISTS category_id varchar,
        ADD COLUMN IF NOT EXISTS paid_amount numeric(15, 2),
        ADD COLUMN IF NOT EXISTS interest numeric(15, 2) DEFAULT '0',
        ADD COLUMN IF NOT EXISTS payment_date timestamp,
        ADD COLUMN IF NOT EXISTS installment_group text,
        ADD COLUMN IF NOT EXISTS installment_number integer,
        ADD COLUMN IF NOT EXISTS installment_total integer,
        ADD COLUMN IF NOT EXISTS payment_method text,
        ADD COLUMN IF NOT EXISTS is_reconciled boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now(),
        ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

      CREATE TABLE IF NOT EXISTS categories (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        name text NOT NULL,
        type text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bank_statement_items (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        date timestamp NOT NULL,
        amount numeric(15, 2) NOT NULL,
        description text NOT NULL,
        status text DEFAULT 'PENDING' NOT NULL,
        transaction_id varchar,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("[SchemaPatch] Core schema ensured");
  } catch (error) {
    console.error("[SchemaPatch] Failed to patch schema", error);
  }
}
