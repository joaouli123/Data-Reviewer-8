import { db, pool } from './db';
import { customers, suppliers, categories, transactions, cashFlow, sales, purchases, DEFAULT_CATEGORIES } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Starting comprehensive database seed...');

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

    // Insert customers - EXPANDED
    console.log('👥 Creating customers...');
    const customerData = [
      { name: 'Maria Silva Santos', contact: 'maria@email.com', phone: '(11) 99999-1111', status: 'ativo' },
      { name: 'João Pedro Oliveira', contact: 'joao@email.com', phone: '(11) 99999-2222', status: 'ativo' },
      { name: 'Ana Costa Ferreira', contact: 'ana@email.com', phone: '(11) 99999-3333', status: 'ativo' },
      { name: 'Pedro Oliveira Santos', contact: 'pedro@email.com', phone: '(11) 99999-4444', status: 'ativo' },
      { name: 'Carla Ferreira Lima', contact: 'carla@email.com', phone: '(11) 99999-5555', status: 'ativo' },
      { name: 'Lucas Almeida Silva', contact: 'lucas@email.com', phone: '(11) 99999-6666', status: 'ativo' },
      { name: 'Fernanda Costa Pereira', contact: 'fernanda@email.com', phone: '(11) 99999-7777', status: 'ativo' },
      { name: 'Roberto Martins Silva', contact: 'roberto@email.com', phone: '(11) 99999-8888', status: 'ativo' },
      { name: 'Juliana Gomes Santos', contact: 'juliana@email.com', phone: '(11) 99999-9999', status: 'ativo' },
      { name: 'Marcelo Ribeiro Oliveira', contact: 'marcelo@email.com', phone: '(11) 98888-1111', status: 'ativo' },
    ];
    await db.insert(customers).values(customerData);
    const insertedCustomers = await db.select().from(customers);
    console.log(`   ✅ ${insertedCustomers.length} customers created`);

    // Insert suppliers - EXPANDED
    console.log('🏢 Creating suppliers...');
    const supplierData = [
      { name: 'Fornecedor ABC Ltda', contact: 'abc@fornecedor.com', phone: '(11) 3333-1111', cnpj: '12.345.678/0001-90', status: 'ativo' },
      { name: 'Distribuidora XYZ', contact: 'xyz@fornecedor.com', phone: '(11) 3333-2222', cnpj: '98.765.432/0001-10', status: 'ativo' },
      { name: 'Atacado Central', contact: 'central@fornecedor.com', phone: '(11) 3333-3333', cnpj: '11.222.333/0001-44', status: 'ativo' },
      { name: 'Importadora Brasil', contact: 'importa@fornecedor.com', phone: '(11) 3333-4444', cnpj: '44.555.666/0001-77', status: 'ativo' },
      { name: 'Logística Express', contact: 'logistica@fornecedor.com', phone: '(11) 3333-5555', cnpj: '77.888.999/0001-22', status: 'ativo' },
    ];
    await db.insert(suppliers).values(supplierData);
    const insertedSuppliers = await db.select().from(suppliers);
    console.log(`   ✅ ${insertedSuppliers.length} suppliers created`);

    // Generate transactions from last month to March 2026
    console.log('💰 Creating comprehensive transactions...');
    const transactionData: any[] = [];
    const today = new Date();
    
    // Helper to create date at noon UTC
    const createDate = (daysOffset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysOffset);
      const dateStr = d.toISOString().split('T')[0];
      return new Date(`${dateStr}T12:00:00Z`);
    };

    // Descriptions for variety
    const saleDescriptions = [
      'Venda de produtos',
      'Serviço prestado',
      'Consultoria',
      'Manutenção',
      'Suporte técnico',
      'Treinamento',
    ];

    const purchaseDescriptions = [
      'Compra de matéria-prima',
      'Aquisição de equipamentos',
      'Serviços contratados',
      'Suprimentos',
      'Estoque',
      'Insumos de produção',
    ];

    // PAST transactions (last 31 days) - mostly PAID
    console.log('   - Past transactions...');
    for (let i = 31; i >= 1; i--) {
      // Multiple revenue transactions per day
      for (let r = 0; r < 2; r++) {
        if (Math.random() > 0.3) {
          const customer = insertedCustomers[Math.floor(Math.random() * insertedCustomers.length)];
          const amount = (Math.random() * 8000 + 1000).toFixed(2);
          const date = createDate(-i);
          transactionData.push({
            customerId: customer.id,
            categoryId: vendasCat?.id,
            type: 'venda',
            amount: amount,
            paidAmount: amount,
            description: saleDescriptions[Math.floor(Math.random() * saleDescriptions.length)] + ` - ${customer.name}`,
            date: date,
            paymentDate: date,
            shift: Math.random() > 0.5 ? 'manhã' : 'tarde',
            status: 'pago',
          });
        }
      }

      // Multiple expense transactions per day
      for (let p = 0; p < 2; p++) {
        if (Math.random() > 0.4) {
          const supplier = insertedSuppliers[Math.floor(Math.random() * insertedSuppliers.length)];
          const amount = (Math.random() * 5000 + 500).toFixed(2);
          const date = createDate(-i);
          transactionData.push({
            supplierId: supplier.id,
            categoryId: comprasCat?.id,
            type: 'compra',
            amount: amount,
            paidAmount: amount,
            description: purchaseDescriptions[Math.floor(Math.random() * purchaseDescriptions.length)] + ` - ${supplier.name}`,
            date: date,
            paymentDate: date,
            shift: Math.random() > 0.5 ? 'manhã' : 'tarde',
            status: 'pago',
          });
        }
      }
    }

    // TODAY'S transactions
    console.log('   - Today transactions...');
    for (let j = 0; j < 8; j++) {
      const customer = insertedCustomers[j % insertedCustomers.length];
      const amount = (Math.random() * 3000 + 500).toFixed(2);
      const isPaid = Math.random() > 0.4;
      const todayDate = createDate(0);
      transactionData.push({
        customerId: customer.id,
        categoryId: vendasCat?.id,
        type: 'venda',
        amount: amount,
        paidAmount: isPaid ? amount : '0',
        description: 'Venda do dia - ' + saleDescriptions[Math.floor(Math.random() * saleDescriptions.length)],
        date: todayDate,
        paymentDate: isPaid ? todayDate : null,
        shift: 'manhã',
        status: isPaid ? 'pago' : 'pendente',
      });
    }

    // FUTURE transactions with MULTIPLE INSTALLMENTS (from today to March 2026)
    console.log('   - Future installments (2-6 parcelas)...');
    
    // Customer sales with installments
    for (let c = 0; c < insertedCustomers.length; c++) {
      const customer = insertedCustomers[c];
      const numberOfSales = Math.floor(Math.random() * 4) + 2; // 2-5 sales each
      
      for (let s = 0; s < numberOfSales; s++) {
        const baseAmount = (Math.random() * 6000 + 2000).toFixed(2);
        const installmentCount = Math.floor(Math.random() * 5) + 2; // 2-6 installments
        const installmentAmount = (parseFloat(baseAmount) / installmentCount).toFixed(2);
        
        // Stagger start dates (start from today to 60 days in future)
        const startDayOffset = Math.floor(Math.random() * 60);
        
        for (let k = 0; k < installmentCount; k++) {
          const dueDate = createDate(startDayOffset + 30 * k); // Every 30 days
          const isPaid = dueDate <= today; // Older dates are paid
          transactionData.push({
            customerId: customer.id,
            categoryId: vendasCat?.id,
            type: 'venda',
            amount: installmentAmount,
            paidAmount: isPaid ? installmentAmount : '0',
            description: `Parcela ${k + 1}/${installmentCount} - ${customer.name}`,
            date: dueDate,
            paymentDate: isPaid ? dueDate : null,
            shift: 'tarde',
            status: isPaid ? 'pago' : 'pendente',
          });
        }
      }
    }

    // Supplier purchases with installments
    for (let s = 0; s < insertedSuppliers.length; s++) {
      const supplier = insertedSuppliers[s];
      const numberOfPurchases = Math.floor(Math.random() * 4) + 2; // 2-5 purchases each
      
      for (let p = 0; p < numberOfPurchases; p++) {
        const baseAmount = (Math.random() * 10000 + 3000).toFixed(2);
        const installmentCount = Math.floor(Math.random() * 4) + 2; // 2-5 installments
        const installmentAmount = (parseFloat(baseAmount) / installmentCount).toFixed(2);
        
        // Stagger start dates
        const startDayOffset = Math.floor(Math.random() * 60);
        
        for (let k = 0; k < installmentCount; k++) {
          const dueDate = createDate(startDayOffset + 30 * k);
          const isPaid = dueDate <= today;
          transactionData.push({
            supplierId: supplier.id,
            categoryId: comprasCat?.id,
            type: 'compra',
            amount: installmentAmount,
            paidAmount: isPaid ? installmentAmount : '0',
            description: `Parcela ${k + 1}/${installmentCount} - ${supplier.name}`,
            date: dueDate,
            paymentDate: isPaid ? dueDate : null,
            shift: 'tarde',
            status: isPaid ? 'pago' : 'pendente',
          });
        }
      }
    }

    console.log(`   - Total transactions to insert: ${transactionData.length}`);

    // Insert all transactions in batches
    const batchSize = 100;
    for (let i = 0; i < transactionData.length; i += batchSize) {
      const batch = transactionData.slice(i, i + batchSize);
      await db.insert(transactions).values(batch);
      console.log(`   - Batch ${Math.floor(i / batchSize) + 1} inserted`);
    }
    
    const insertedTransactions = await db.select().from(transactions);
    console.log(`   ✅ ${insertedTransactions.length} transactions created`);

    // Summary
    const paidCount = insertedTransactions.filter(t => t.status === 'pago').length;
    const pendingCount = insertedTransactions.filter(t => t.status === 'pendente').length;
    const vendaCount = insertedTransactions.filter(t => t.type === 'venda').length;
    const compraCount = insertedTransactions.filter(t => t.type === 'compra').length;

    // Calculate totals
    const totalVendas = insertedTransactions
      .filter(t => t.type === 'venda')
      .reduce((sum, t) => sum + parseFloat(t.paidAmount || 0), 0);
    const totalCompras = insertedTransactions
      .filter(t => t.type === 'compra')
      .reduce((sum, t) => sum + parseFloat(t.paidAmount || 0), 0);

    console.log('\n📊 Database Summary:');
    console.log(`   - Categories: ${insertedCategories.length}`);
    console.log(`   - Customers: ${insertedCustomers.length}`);
    console.log(`   - Suppliers: ${insertedSuppliers.length}`);
    console.log(`   - Total Transactions: ${insertedTransactions.length}`);
    console.log(`     • Paid: ${paidCount}`);
    console.log(`     • Pending: ${pendingCount}`);
    console.log(`     • Sales (Vendas): ${vendaCount}`);
    console.log(`     • Purchases (Compras): ${compraCount}`);
    console.log(`   - Financial Summary:`);
    console.log(`     • Total Sales: R$ ${totalVendas.toFixed(2).replace('.', ',')}`);
    console.log(`     • Total Purchases: R$ ${totalCompras.toFixed(2).replace('.', ',')}`);
    console.log(`     • Net Profit: R$ ${(totalVendas - totalCompras).toFixed(2).replace('.', ',')}`);

    console.log('\n✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch(console.error);
