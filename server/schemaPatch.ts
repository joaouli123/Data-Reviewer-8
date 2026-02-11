import { pool } from "./db";

// Executa DDL mínima para o app rodar. Idempotente.
export async function ensureCoreSchema() {
  try {
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      -- Empresas e usuários (campos mínimos usados pelo app)
      CREATE TABLE IF NOT EXISTS companies (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        document text NOT NULL UNIQUE,
        cnpj text,
        subscription_status text NOT NULL DEFAULT 'pending',
        payment_status text NOT NULL DEFAULT 'pending',
        subscription_plan text NOT NULL DEFAULT 'basic',
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS users (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar REFERENCES companies(id) ON DELETE CASCADE,
        username text NOT NULL UNIQUE,
        email text,
        password text NOT NULL,
        name text,
        first_name text,
        last_name text,
        phone text,
        cep text,
        rua text,
        numero text,
        complemento text,
        estado text,
        cidade text,
        avatar text,
        role text NOT NULL DEFAULT 'user',
        is_super_admin boolean NOT NULL DEFAULT false,
        permissions jsonb DEFAULT '{}'::jsonb,
        status text NOT NULL DEFAULT 'active',
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );

      -- Categorias
      CREATE TABLE IF NOT EXISTS categories (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        name text NOT NULL,
        type text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      );

      -- Clientes e Fornecedores
      CREATE TABLE IF NOT EXISTS customers (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        name text NOT NULL,
        cpf text,
        cnpj text,
        contact text,
        email text,
        phone text,
        category text,
        status text NOT NULL DEFAULT 'ativo',
        created_at timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        name text NOT NULL,
        contact text,
        email text,
        phone text,
        cpf text,
        cnpj text,
        category text,
        payment_terms text,
        status text NOT NULL DEFAULT 'ativo',
        created_at timestamp NOT NULL DEFAULT now()
      );

      -- Transações (base das métricas)
      CREATE TABLE IF NOT EXISTS transactions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        customer_id varchar,
        supplier_id varchar,
        category_id varchar,
        type text NOT NULL,
        amount numeric(15, 2) NOT NULL,
        original_amount numeric(15, 2),
        paid_amount numeric(15, 2),
        interest numeric(15, 2) DEFAULT 0,
        card_fee numeric(15, 2) DEFAULT 0,
        has_card_fee boolean DEFAULT false,
        payment_date timestamp,
        description text,
        date timestamp NOT NULL,
        shift text NOT NULL DEFAULT 'default',
        status text NOT NULL DEFAULT 'pendente',
        installment_group text,
        installment_number integer,
        installment_total integer,
        payment_method text,
        is_reconciled boolean DEFAULT false,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );

      -- Reforço de colunas caso tabela já exista
      ALTER TABLE IF EXISTS transactions
        ADD COLUMN IF NOT EXISTS date timestamp,
        ADD COLUMN IF NOT EXISTS shift text DEFAULT 'default',
        ADD COLUMN IF NOT EXISTS type text,
        ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendente',
        ADD COLUMN IF NOT EXISTS customer_id varchar,
        ADD COLUMN IF NOT EXISTS supplier_id varchar,
        ADD COLUMN IF NOT EXISTS paid_amount numeric(15,2),
        ADD COLUMN IF NOT EXISTS interest numeric(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS card_fee numeric(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS has_card_fee boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS original_amount numeric(15,2),
        ADD COLUMN IF NOT EXISTS payment_date timestamp,
        ADD COLUMN IF NOT EXISTS installment_group text,
        ADD COLUMN IF NOT EXISTS installment_number integer,
        ADD COLUMN IF NOT EXISTS installment_total integer,
        ADD COLUMN IF NOT EXISTS payment_method text,
        ADD COLUMN IF NOT EXISTS is_reconciled boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now(),
        ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

      -- Vendas e Compras
      CREATE TABLE IF NOT EXISTS sales (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        customer_id varchar,
        date timestamp NOT NULL DEFAULT now(),
        amount numeric(15,2) NOT NULL,
        paid_amount numeric(15,2) DEFAULT 0,
        installment_count integer DEFAULT 1,
        status text NOT NULL DEFAULT 'pendente',
        description text,
        category_id varchar,
        payment_method text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        supplier_id varchar,
        date timestamp NOT NULL DEFAULT now(),
        amount numeric(15,2) NOT NULL,
        paid_amount numeric(15,2) DEFAULT 0,
        installment_count integer DEFAULT 1,
        status text NOT NULL DEFAULT 'pendente',
        description text,
        category_id varchar,
        payment_method text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS installments (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        sale_id varchar,
        amount numeric(15,2) NOT NULL,
        due_date timestamp NOT NULL,
        paid boolean DEFAULT false,
        paid_date timestamp
      );

      CREATE TABLE IF NOT EXISTS purchase_installments (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        purchase_id varchar,
        amount numeric(15,2) NOT NULL,
        due_date timestamp NOT NULL,
        paid boolean DEFAULT false,
        paid_date timestamp
      );

      -- Conciliação bancária
      CREATE TABLE IF NOT EXISTS bank_statement_items (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        date timestamp NOT NULL,
        amount numeric(15, 2) NOT NULL,
        description text NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        transaction_id varchar,
        created_at timestamp NOT NULL DEFAULT now()
      );

      -- Fluxo de caixa agregado
      CREATE TABLE IF NOT EXISTS cash_flow (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        date timestamp NOT NULL,
        inflow numeric(15,2) NOT NULL DEFAULT 0,
        outflow numeric(15,2) NOT NULL DEFAULT 0,
        balance numeric(15,2) NOT NULL,
        description text,
        shift text NOT NULL DEFAULT 'default'
      );
    `);
    console.log("[SchemaPatch] Core schema ensured");

    // Fix: make sessions.company_id nullable for super admins without a company
    await pool.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sessions' AND column_name = 'company_id' AND is_nullable = 'NO'
        ) THEN
          ALTER TABLE sessions ALTER COLUMN company_id DROP NOT NULL;
        END IF;
      END $$;
    `);

    // Cleanup old login attempts (older than 24 hours) to prevent unbounded growth
    await pool.query(`
      DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '24 hours';
    `);

    // Performance indexes on frequently queried columns
    await pool.query(`
      -- Transaction indexes
      CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON transactions (company_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
      CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions (customer_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_supplier_id ON transactions (supplier_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
      CREATE INDEX IF NOT EXISTS idx_transactions_company_type ON transactions (company_id, type);
      CREATE INDEX IF NOT EXISTS idx_transactions_installment_group ON transactions (installment_group);

      -- User indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
      CREATE INDEX IF NOT EXISTS idx_users_company_id ON users (company_id);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);

      -- Customer & Supplier indexes
      CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers (company_id);
      CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers (company_id);

      -- Session indexes
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

      -- Audit log indexes
      CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs (company_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

      -- Subscription indexes
      CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions (company_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);

      -- Bank statement indexes
      CREATE INDEX IF NOT EXISTS idx_bank_statement_items_company_id ON bank_statement_items (company_id);

      -- Category indexes
      CREATE INDEX IF NOT EXISTS idx_categories_company_id ON categories (company_id);
    `);
    console.log("[SchemaPatch] Performance indexes ensured");
  } catch (error) {
    console.error("[SchemaPatch] Failed to patch schema", error);
  }
}
