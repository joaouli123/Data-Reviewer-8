import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const brazilianFirstNames = [
  'João', 'Maria', 'Carlos', 'Ana', 'Pedro', 'Francisca', 'José', 'Marcela', 'André', 'Juliana',
  'Bruno', 'Camila', 'Diego', 'Beatriz', 'Rafael', 'Isabella', 'Leonardo', 'Sophia', 'Gustavo', 'Valentina',
  'Marcus', 'Bruna', 'Thiago', 'Carolina', 'Felipe', 'Fernanda', 'Ricardo', 'Letícia', 'Matheus', 'Gabriela',
  'Rodrigo', 'Larissa', 'Lucas', 'Mariana', 'Fernando', 'Vivian', 'Sergio', 'Patricia', 'Augusto', 'Monica',
];

const brazilianLastNames = [
  'Silva', 'Santos', 'Oliveira', 'Costa', 'Ferreira', 'Pereira', 'Gomes', 'Martins', 'Alves', 'Souza',
  'Monteiro', 'Rocha', 'Ribeiro', 'Carvalho', 'Neves', 'Lima', 'Barbosa', 'Araujo', 'Moreira', 'Correia',
  'Duarte', 'Teixeira', 'Couto', 'Borges', 'Cunha', 'Medina', 'Machado', 'Mendes', 'Tavares', 'Azevedo',
];

const companyNames = [
  'Tech Solutions', 'Global Commerce', 'Prime Distribution', 'Industrial Works', 'Smart Services',
  'Fast Logistics', 'Quality Manufacturing', 'Elite Consulting', 'Power Industries', 'Digital Innovation',
  'Commerce Plus', 'Apex Trading', 'Metro Supply', 'Advanced Systems', 'Stellar Group',
  'Dynamic Solutions', 'Premium Services', 'Green Energy', 'Future Tech', 'Urban Commerce',
];

const companyTypes = [
  'Comércio', 'Indústria', 'Serviços', 'Consultoria', 'Logística',
  'Distribuição', 'Manufatura', 'Varejo', 'Exportação', 'Tecnologia',
];

const shifts = ['Manhã', 'Tarde', 'Noite'];
const transactionTypes = ['venda', 'compra', 'devolução', 'ajuste', 'pagamento'];
const paymentTerms = ['À vista', '30 dias', '60 dias', '90 dias', 'Parcelas'];
const descriptions = [
  'Venda de produtos diversos', 'Compra de matéria-prima', 'Serviço de consultoria', 'Aluguel de instalações',
  'Manutenção de equipamentos', 'Transporte e frete', 'Consumo de energia', 'Salários e encargos',
  'Fornecimento de materiais', 'Aluguel comercial', 'Consultoria técnica', 'Reparos diversos',
  'Compra de insumos', 'Serviço de limpeza', 'Fornecimento especializado',
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomName() {
  return `${getRandomElement(brazilianFirstNames)} ${getRandomElement(brazilianLastNames)}`;
}

function getRandomCompanyName() {
  return `${getRandomElement(companyNames)} ${getRandomElement(companyTypes)}`;
}

function getRandomEmail(name) {
  const sanitized = name.toLowerCase().replace(/\s+/g, '.');
  return `${sanitized}@exemplo.com.br`;
}

function getRandomPhone() {
  const area = String(Math.floor(Math.random() * 90 + 10));
  const first = String(Math.floor(Math.random() * 90000 + 10000));
  const second = String(Math.floor(Math.random() * 9000 + 1000));
  return `(${area}) ${first}-${second}`;
}

function getRandomAmount(min, max) {
  const value = Math.floor(Math.random() * (max - min + 1) + min);
  return value.toFixed(2);
}

function getDateRange(period) {
  const today = new Date();
  let start, end;

  if (period === 'thisWeek') {
    end = new Date(today);
    start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1);
  } else if (period === 'lastMonth') {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    start = lastMonth;
    end = new Date(today.getFullYear(), today.getMonth(), 0);
  } else {
    const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    start = twoMonthsAgo;
    end = new Date(today.getFullYear(), today.getMonth() - 1, 0);
  }

  return { start, end };
}

function getRandomDateInRange(start, end) {
  const time = Math.random() * (end.getTime() - start.getTime()) + start.getTime();
  return new Date(time);
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('✅ Connected to database');
    console.log('Starting data seeding...\n');

    // Create users
    console.log('📝 Creating demo user...');
    await client.query(
      `INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      ['demo', 'password123']
    );

    // Create customers
    console.log('👥 Creating customers...');
    const customerData = Array.from({ length: 15 }, () => [
      getRandomName(),
      getRandomName(),
      getRandomEmail(getRandomName()),
      getRandomPhone(),
      getRandomElement(['ativo', 'inativo']),
    ]);

    const customerIds = [];
    for (const [name, contact, email, phone, status] of customerData) {
      const result = await client.query(
        `INSERT INTO customers (name, contact, email, phone, status) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [name, contact, email, phone, status]
      );
      customerIds.push(result.rows[0].id);
    }
    console.log(`✅ Created ${customerIds.length} customers`);

    // Create suppliers
    console.log('🏭 Creating suppliers...');
    const supplierData = Array.from({ length: 12 }, () => [
      getRandomCompanyName(),
      getRandomName(),
      getRandomEmail(getRandomCompanyName()),
      getRandomPhone(),
      getRandomElement(paymentTerms),
      getRandomElement(['ativo', 'inativo']),
    ]);

    const supplierIds = [];
    for (const [name, contact, email, phone, paymentTerm, status] of supplierData) {
      const result = await client.query(
        `INSERT INTO suppliers (name, contact, email, phone, payment_terms, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [name, contact, email, phone, paymentTerm, status]
      );
      supplierIds.push(result.rows[0].id);
    }
    console.log(`✅ Created ${supplierIds.length} suppliers`);

    // Create transactions
    console.log('💰 Creating transactions for 3 periods...');
    const periods = [
      { period: 'thisWeek', count: 12 },
      { period: 'lastMonth', count: 15 },
      { period: 'twoMonthsAgo', count: 15 },
    ];

    let totalTransactions = 0;
    for (const { period, count } of periods) {
      const range = getDateRange(period);
      for (let i = 0; i < count; i++) {
        const customerId = Math.random() > 0.3 ? getRandomElement(customerIds) : null;
        const supplierId = Math.random() > 0.3 ? getRandomElement(supplierIds) : null;
        const type = getRandomElement(transactionTypes);
        const amount = getRandomAmount(50, 50000);
        const description = getRandomElement(descriptions);
        const date = getRandomDateInRange(range.start, range.end);
        const shift = getRandomElement(shifts);
        const status = getRandomElement(['pendente', 'concluído']);

        await client.query(
          `INSERT INTO transactions (customer_id, supplier_id, type, amount, description, date, shift, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [customerId, supplierId, type, amount, description, date, shift, status]
        );
        totalTransactions++;
      }
    }
    console.log(`✅ Created ${totalTransactions} transactions`);

    // Create cash flow
    console.log('📊 Creating cash flow records...');
    let totalCashFlows = 0;
    for (const { period, count } of periods) {
      const range = getDateRange(period);
      for (let i = 0; i < count; i++) {
        const date = getRandomDateInRange(range.start, range.end);
        const inflow = parseFloat(getRandomAmount(1000, 100000));
        const outflow = parseFloat(getRandomAmount(500, 80000));
        const balance = (inflow - outflow).toFixed(2);
        const description = getRandomElement(descriptions);
        const shift = getRandomElement(shifts);

        await client.query(
          `INSERT INTO cash_flow (date, inflow, outflow, balance, description, shift) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [date, inflow.toFixed(2), outflow.toFixed(2), balance, description, shift]
        );
        totalCashFlows++;
      }
    }
    console.log(`✅ Created ${totalCashFlows} cash flow records`);

    console.log('\n🎉 Seeding completed successfully!');
    console.log(`📈 Total data points created: ${1 + customerIds.length + supplierIds.length + totalTransactions + totalCashFlows}`);
    console.log(`  - Demo user: 1`);
    console.log(`  - Customers: ${customerIds.length}`);
    console.log(`  - Suppliers: ${supplierIds.length}`);
    console.log(`  - Transactions: ${totalTransactions}`);
    console.log(`  - Cash Flows: ${totalCashFlows}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
