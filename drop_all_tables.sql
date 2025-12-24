-- Drop all tables in the correct order (respecting foreign keys)
DROP TABLE IF EXISTS "audit_logs" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "login_attempts" CASCADE;
DROP TABLE IF EXISTS "purchase_installments" CASCADE;
DROP TABLE IF EXISTS "installments" CASCADE;
DROP TABLE IF EXISTS "purchases" CASCADE;
DROP TABLE IF EXISTS "sales" CASCADE;
DROP TABLE IF EXISTS "cash_flow" CASCADE;
DROP TABLE IF EXISTS "transactions" CASCADE;
DROP TABLE IF EXISTS "categories" CASCADE;
DROP TABLE IF EXISTS "suppliers" CASCADE;
DROP TABLE IF EXISTS "customers" CASCADE;
DROP TABLE IF EXISTS "invitations" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "subscriptions" CASCADE;
DROP TABLE IF EXISTS "companies" CASCADE;
DROP TABLE IF EXISTS "__drizzle_migrations__" CASCADE;

-- Verify all tables are dropped
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
