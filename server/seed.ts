import { db, pool } from './db';
import { customers, suppliers, categories, transactions, cashFlow, sales, purchases, DEFAULT_CATEGORIES } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await db.delete(transactions);
    await db.delete(cashFlow);
    await db.delete(sales);
    await db.delete(purchases);
    await db.delete(customers);
    await db.delete(suppliers);
    await db.delete(categories);

    // Insert categories
    console.log('📁 Creating categories...');
    const categoryData = DEFAULT_CATEGORIES.map(cat => ({
      name: cat.name,
      type: cat.type,
    }));
    await db.insert(categories).values(categoryData);
    const insertedCategories = await db.select().from(categories);
    console.log(`   ✅ ${insertedCategories.length} categories created`);

    // Get category IDs
    const vendasCat = insertedCategories.find(c => c.name === 'Vendas');
    const comprasCat = insertedCategories.find(c => c.name === 'Compras');

    // Insert customers
    console.log('👥 Creating customers...');
    const customerData = [
      { name: 'Maria Silva', contact: 'maria@email.com', phone: '(11) 99999-1111', status: 'ativo' },
      { name: 'João Santos', contact: 'joao@email.com', phone: '(11) 99999-2222', status: 'ativo' },
      { name: 'Ana Costa', contact: 'ana@email.com', phone: '(11) 99999-3333', status: 'ativo' },
      { name: 'Pedro Oliveira', contact: 'pedro@email.com', phone: '(11) 99999-4444', status: 'ativo' },
      { name: 'Carla Ferreira', contact: 'carla@email.com', phone: '(11) 99999-5555', status: 'ativo' },
    ];
    await db.insert(customers).values(customerData);
    const insertedCustomers = await db.select().from(customers);
    console.log(`   ✅ ${insertedCustomers.length} customers created`);

    // Insert suppliers
    console.log('🏢 Creating suppliers...');
    const supplierData = [
      { name: 'Fornecedor ABC Ltda', contact: 'abc@fornecedor.com', phone: '(11) 3333-1111', cnpj: '12.345.678/0001-90', status: 'ativo' },
      { name: 'Distribuidora XYZ', contact: 'xyz@fornecedor.com', phone: '(11) 3333-2222', cnpj: '98.765.432/0001-10', status: 'ativo' },
      { name: 'Atacado Central', contact: 'central@fornecedor.com', phone: '(11) 3333-3333', cnpj: '11.222.333/0001-44', status: 'ativo' },
    ];
    await db.insert(suppliers).values(supplierData);
    const insertedSuppliers = await db.select().from(suppliers);
    console.log(`   ✅ ${insertedSuppliers.length} suppliers created`);

    // Generate transactions for the last 3 months and next 2 months
    console.log('💰 Creating transactions...');
    const transactionData: any[] = [];
    const today = new Date();
    
    // Helper to create date at noon UTC
    const createDate = (daysOffset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysOffset);
      const dateStr = d.toISOString().split('T')[0];
      return new Date(`${dateStr}T12:00:00Z`);
    };

    // Past transactions (last 90 days) - paid
    for (let i = 90; i >= 1; i--) {
      // Random revenue transactions
      if (Math.random() > 0.4) {
        const customer = insertedCustomers[Math.floor(Math.random() * insertedCustomers.length)];
        const amount = (Math.random() * 5000 + 500).toFixed(2);
        const date = createDate(-i);
        transactionData.push({
          customerId: customer.id,
          categoryId: vendasCat?.id,
          type: 'venda',
          amount: amount,
          paidAmount: amount,
          description: `Venda para ${customer.name}`,
          date: date,
          paymentDate: date,
          shift: Math.random() > 0.5 ? 'manhã' : 'tarde',
          status: 'pago',
        });
      }

      // Random expense transactions
      if (Math.random() > 0.5) {
        const supplier = insertedSuppliers[Math.floor(Math.random() * insertedSuppliers.length)];
        const amount = (Math.random() * 3000 + 200).toFixed(2);
        const date = createDate(-i);
        transactionData.push({
          supplierId: supplier.id,
          categoryId: comprasCat?.id,
          type: 'compra',
          amount: amount,
          paidAmount: amount,
          description: `Compra de ${supplier.name}`,
          date: date,
          paymentDate: date,
          shift: Math.random() > 0.5 ? 'manhã' : 'tarde',
          status: 'pago',
        });
      }
    }

    // Today's transactions (some paid, some pending)
    for (let j = 0; j < 5; j++) {
      const customer = insertedCustomers[Math.floor(Math.random() * insertedCustomers.length)];
      const amount = (Math.random() * 2000 + 300).toFixed(2);
      const isPaid = Math.random() > 0.3;
      const todayDate = createDate(0);
      transactionData.push({
        customerId: customer.id,
        categoryId: vendasCat?.id,
        type: 'venda',
        amount: amount,
        paidAmount: isPaid ? amount : '0',
        description: `Venda do dia - ${customer.name}`,
        date: todayDate,
        paymentDate: isPaid ? todayDate : null,
        shift: 'manhã',
        status: isPaid ? 'pago' : 'pendente',
      });
    }

    // Future transactions (next 60 days) - pending installments
    console.log('📅 Creating future installments...');
    
    // Create installments for multiple customers
    for (const customer of insertedCustomers.slice(0, 3)) {
      const baseAmount = (Math.random() * 3000 + 1000).toFixed(2);
      const installmentCount = Math.floor(Math.random() * 5) + 2; // 2-6 installments
      const installmentAmount = (parseFloat(baseAmount) / installmentCount).toFixed(2);
      
      for (let k = 0; k < installmentCount; k++) {
        const dueDate = createDate(30 * (k + 1)); // Monthly installments
        transactionData.push({
          customerId: customer.id,
          categoryId: vendasCat?.id,
          type: 'venda',
          amount: installmentAmount,
          paidAmount: '0',
          description: `Parcela ${k + 1}/${installmentCount} - ${customer.name}`,
          date: dueDate,
          paymentDate: null,
          shift: 'manhã',
          status: 'pendente',
        });
      }
    }

    // Future supplier payments
    for (const supplier of insertedSuppliers.slice(0, 2)) {
      const baseAmount = (Math.random() * 5000 + 2000).toFixed(2);
      const installmentCount = Math.floor(Math.random() * 4) + 2; // 2-5 installments
      const installmentAmount = (parseFloat(baseAmount) / installmentCount).toFixed(2);
      
      for (let k = 0; k < installmentCount; k++) {
        const dueDate = createDate(30 * (k + 1)); // Monthly installments
        transactionData.push({
          supplierId: supplier.id,
          categoryId: comprasCat?.id,
          type: 'compra',
          amount: installmentAmount,
          paidAmount: '0',
          description: `Parcela ${k + 1}/${installmentCount} - ${supplier.name}`,
          date: dueDate,
          paymentDate: null,
          shift: 'manhã',
          status: 'pendente',
        });
      }
    }

    // Insert all transactions in batches
    const batchSize = 50;
    for (let i = 0; i < transactionData.length; i += batchSize) {
      const batch = transactionData.slice(i, i + batchSize);
      await db.insert(transactions).values(batch);
    }
    
    const insertedTransactions = await db.select().from(transactions);
    console.log(`   ✅ ${insertedTransactions.length} transactions created`);

    // Summary
    const paidCount = insertedTransactions.filter(t => t.status === 'pago').length;
    const pendingCount = insertedTransactions.filter(t => t.status === 'pendente').length;
    const vendaCount = insertedTransactions.filter(t => t.type === 'venda').length;
    const compraCount = insertedTransactions.filter(t => t.type === 'compra').length;

    console.log('\n📊 Summary:');
    console.log(`   - Categories: ${insertedCategories.length}`);
    console.log(`   - Customers: ${insertedCustomers.length}`);
    console.log(`   - Suppliers: ${insertedSuppliers.length}`);
    console.log(`   - Transactions: ${insertedTransactions.length}`);
    console.log(`     - Paid: ${paidCount}`);
    console.log(`     - Pending: ${pendingCount}`);
    console.log(`     - Vendas: ${vendaCount}`);
    console.log(`     - Compras: ${compraCount}`);

    console.log('\n✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch(console.error);
