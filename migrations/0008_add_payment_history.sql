-- Migration: Add payment_history to transactions
-- Stores all partial/full payment events for each transaction

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_history TEXT NOT NULL DEFAULT '[]';

COMMENT ON COLUMN transactions.payment_history IS 'Histórico JSON de pagamentos parciais e quitação por transação';
