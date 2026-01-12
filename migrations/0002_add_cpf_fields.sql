-- Add CPF column to customers table
ALTER TABLE "customers" ADD COLUMN "cpf" text;

-- Add CPF column to suppliers table
ALTER TABLE "suppliers" ADD COLUMN "cpf" text;
