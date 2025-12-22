ALTER TABLE transactions ADD COLUMN paid_amount decimal(15, 2);
ALTER TABLE transactions ADD COLUMN interest decimal(15, 2) DEFAULT 0;
