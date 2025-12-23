/**
 * Database initialization script for production
 * Run with: npx tsx server/setup-db.ts
 * 
 * This script:
 * 1. Creates all database tables
 * 2. Seeds initial data (categories, customers, suppliers, transactions)
 */

import { db, pool } from './db';
import { sql } from 'drizzle-orm';
import { 
  customers, suppliers, categories, transactions, 
  DEFAULT_CATEGORIES 
} from '../shared/schema';

async function initializeDatabase() {
  console.log('🚀 Initializing production database...\n');
  
  try {
    // Create all tables
    console.log('📋 Creating database tables...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ categories table created');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(255),
        phone VARCHAR(20),
        status VARCHAR(50) DEFAULT 'ativo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ customers table created');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(255),
        phone VARCHAR(20),
        cnpj VARCHAR(20),
        status VARCHAR(50) DEFAULT 'ativo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ suppliers table created');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID,
        supplier_id UUID,
        category_id INTEGER,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        paid_amount DECIMAL(12, 2) DEFAULT 0,
        interest DECIMAL(12, 2) DEFAULT 0,
        payment_date DATE,
        description TEXT,
        date DATE NOT NULL,
        shift VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);
    console.log('   ✅ transactions table created');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);
    console.log('   ✅ sales table created');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS installments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_id UUID NOT NULL,
        installment_number INTEGER NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        due_date DATE NOT NULL,
        paid_date DATE,
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id)
      )
    `);
    console.log('   ✅ installments table created');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )
    `);
    console.log('   ✅ purchases table created');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS purchase_installments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_id UUID NOT NULL,
        installment_number INTEGER NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        due_date DATE NOT NULL,
        paid_date DATE,
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id)
      )
    `);
    console.log('   ✅ purchase_installments table created');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cash_flow (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ cash_flow table created\n');

    // Seed categories
    console.log('📁 Seeding categories...');
    const categoryData = DEFAULT_CATEGORIES.map(cat => ({
      name: cat.name,
      type: cat.type,
    }));
    await db.insert(categories).values(categoryData).onConflictDoNothing();
    console.log(`   ✅ ${categoryData.length} categories seeded\n`);

    // Seed customers
    console.log('👥 Seeding customers...');
    const customerData = [
      { name: 'Maria Silva Santos', contact: 'maria@email.com', phone: '(11) 99999-1111', status: 'ativo' },
      { name: 'João Pedro Oliveira', contact: 'joao@email.com', phone: '(11) 99999-2222', status: 'ativo' },
      { name: 'Ana Costa Ferreira', contact: 'ana@email.com', phone: '(11) 99999-3333', status: 'ativo' },
      { name: 'Pedro Oliveira Santos', contact: 'pedro@email.com', phone: '(11) 99999-4444', status: 'ativo' },
      { name: 'Carla Ferreira Lima', contact: 'carla@email.com', phone: '(11) 99999-5555', status: 'ativo' },
    ];
    await db.insert(customers).values(customerData).onConflictDoNothing();
    console.log(`   ✅ ${customerData.length} customers seeded\n`);

    // Seed suppliers
    console.log('🏢 Seeding suppliers...');
    const supplierData = [
      { name: 'Fornecedor ABC Ltda', contact: 'abc@fornecedor.com', phone: '(11) 3333-1111', cnpj: '12.345.678/0001-90', status: 'ativo' },
      { name: 'Distribuidora XYZ', contact: 'xyz@fornecedor.com', phone: '(11) 3333-2222', cnpj: '98.765.432/0001-10', status: 'ativo' },
      { name: 'Atacado Central', contact: 'central@fornecedor.com', phone: '(11) 3333-3333', cnpj: '11.222.333/0001-44', status: 'ativo' },
    ];
    await db.insert(suppliers).values(supplierData).onConflictDoNothing();
    console.log(`   ✅ ${supplierData.length} suppliers seeded\n`);

    console.log('✅ DATABASE INITIALIZATION COMPLETE!');
    console.log('\n📝 Production database is now ready with:');
    console.log('   - All tables created');
    console.log('   - Categories, customers, and suppliers seeded');
    console.log('   - Ready to use!\n');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run if executed directly
initializeDatabase();
