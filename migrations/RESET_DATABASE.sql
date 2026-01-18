-- ============================================
-- SCRIPT DE RESET COMPLETO DO BANCO DE DADOS
-- Execute este script para recriar todas as tabelas
-- ============================================

-- Drop all tables in correct order (reverse of dependencies)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS rate_limit CASCADE;

-- ============================================
-- CREATE TABLES
-- ============================================

-- Companies table
CREATE TABLE companies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  document TEXT NOT NULL UNIQUE,
  cnpj TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'pending', -- active, suspended, cancelled, pending
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
  subscription_plan TEXT NOT NULL DEFAULT 'basic', -- basic, pro, enterprise
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'pro',
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, cancelled, blocked
  subscriber_name TEXT,
  payment_method TEXT,
  amount DECIMAL(15, 2),
  ticket_url TEXT,
  is_lifetime BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Users table
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  password TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  estado TEXT,
  cidade TEXT,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- admin, manager, user, operational
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  permissions TEXT DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Sessions table
CREATE TABLE sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Customers table
CREATE TABLE customers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Suppliers table
CREATE TABLE suppliers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Categories table
CREATE TABLE categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- entrada, saida
  color TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Transactions table
CREATE TABLE transactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id VARCHAR REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id VARCHAR REFERENCES suppliers(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- entrada, saida, compra
  category_id VARCHAR REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- pending, completed, cancelled
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Invitations table
CREATE TABLE invitations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired
  expires_at TIMESTAMP NOT NULL,
  created_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Password resets table
CREATE TABLE password_resets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  company_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id VARCHAR,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Rate limit table
CREATE TABLE rate_limit (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  identifier TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt TIMESTAMP NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP
);

-- Login attempts table
CREATE TABLE login_attempts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ip_address TEXT NOT NULL,
  username TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_transactions_company_id ON transactions(company_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_supplier_id ON transactions(supplier_id);
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX idx_categories_company_id ON categories(company_id);
CREATE INDEX idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_rate_limit_identifier ON rate_limit(identifier);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at);

-- ============================================
-- INSERT SUPERADMIN
-- Password: superadmin (hashed with bcrypt)
-- ============================================

INSERT INTO users (
  id,
  company_id,
  username,
  email,
  password,
  name,
  role,
  is_super_admin,
  permissions,
  status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid()::text,
  NULL, -- Super admin doesn't belong to any company
  'superadmin',
  'admin@huacontrol.com',
  '$2b$10$HxjBWp.jPKu0U0W9gdmsGuvR.ZdGSqoQJpy48mzfHXpEPe3UpANpu', -- superadmin
  'Super Administrador',
  'admin',
  true,
  '{"manage_users":true,"manage_companies":true,"view_all":true,"delete_all":true}'::jsonb,
  'active',
  now(),
  now()
);

-- ============================================
-- RESULTADO
-- ============================================
-- Superadmin criado:
-- Username: superadmin
-- Password: superadmin
-- Email: admin@huacontrol.com
-- ============================================

SELECT 'Database reset completed successfully!' AS status;
SELECT 'Superadmin created: username=superadmin, password=superadmin' AS info;
