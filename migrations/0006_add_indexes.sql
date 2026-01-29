-- Add indexes to improve query performance

-- Transactions
create index if not exists idx_transactions_company_date on transactions (company_id, date desc);
create index if not exists idx_transactions_company_type on transactions (company_id, type);
create index if not exists idx_transactions_company_customer on transactions (company_id, customer_id);
create index if not exists idx_transactions_company_supplier on transactions (company_id, supplier_id);
create index if not exists idx_transactions_company_status on transactions (company_id, status);
create index if not exists idx_transactions_company_installment_group on transactions (company_id, installment_group);
create index if not exists idx_transactions_company_payment_date on transactions (company_id, payment_date);

-- Customers / Suppliers / Categories
create index if not exists idx_customers_company on customers (company_id);
create index if not exists idx_suppliers_company on suppliers (company_id);
create index if not exists idx_categories_company on categories (company_id);

-- Bank statement items
create index if not exists idx_bank_items_company_date on bank_statement_items (company_id, date desc);
create index if not exists idx_bank_items_company_status on bank_statement_items (company_id, status);

-- Cash flow
create index if not exists idx_cash_flow_company_date on cash_flow (company_id, date desc);

-- Sales / Purchases
create index if not exists idx_sales_company_date on sales (company_id, date desc);
create index if not exists idx_purchases_company_date on purchases (company_id, date desc);

-- Users / Sessions / Audit
create index if not exists idx_users_company on users (company_id);
create index if not exists idx_users_email on users (email);
create index if not exists idx_sessions_user on sessions (user_id);
create index if not exists idx_audit_company_date on audit_logs (company_id, created_at desc);

-- Login attempts
create index if not exists idx_login_attempts_ip_date on login_attempts (ip_address, created_at desc);

-- Subscriptions
create index if not exists idx_subscriptions_company on subscriptions (company_id);
