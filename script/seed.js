import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { users, customers, suppliers, transactions, cashFlow } from '../shared/schema.ts';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { users, customers, suppliers, transactions, cashFlow } });

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
  console.log('Starting database seeding...');
  try {
    console.log('Creating demo user...');
    await db
      .insert(users)
      .values({
        username: 'demo',
        password: 'password123',
      })
      .onConflictDoNothing();

    console.log('Creating customers...');
    const customerData = Array.from({ length: 15 }, () => ({
      name: getRandomName(),
      contact: getRandomName(),
      email: getRandomEmail(getRandomName()),
      phone: getRandomPhone(),
      status: getRandomElement(['ativo', 'inativo']),
    }));

    const createdCustomers = await db
      .insert(customers)
      .values(customerData)
      .returning();
    console.log(`Created ${createdCustomers.length} customers`);

    console.log('Creating suppliers...');
    const supplierData = Array.from({ length: 12 }, () => ({
      name: getRandomCompanyName(),
      contact: getRandomName(),
      email: getRandomEmail(getRandomCompanyName()),
      phone: getRandomPhone(),
      paymentTerms: getRandomElement(paymentTerms),
      status: getRandomElement(['ativo', 'inativo']),
    }));

    const createdSuppliers = await db
      .insert(suppliers)
      .values(supplierData)
      .returning();
    console.log(`Created ${createdSuppliers.length} suppliers`);

    console.log('Creating transactions for 3 periods...');
    const periods = [
      { period: 'thisWeek', count: 12 },
      { period: 'lastMonth', count: 15 },
      { period: 'twoMonthsAgo', count: 15 },
    ];

    const allTransactions = [];
    for (const { period, count } of periods) {
      const range = getDateRange(period);
      for (let i = 0; i < count; i++) {
        const customerId = getRandomElement(createdCustomers).id;
        const supplierId = getRandomElement(createdSuppliers).id;
        const type = getRandomElement(transactionTypes);

        const transactionData = {
          customerId: Math.random() > 0.3 ? customerId : undefined,
          supplierId: Math.random() > 0.3 ? supplierId : undefined,
          type,
          amount: getRandomAmount(50, 50000),
          description: getRandomElement(descriptions),
          date: getRandomDateInRange(range.start, range.end),
          shift: getRandomElement(shifts),
          status: getRandomElement(['pendente', 'concluído']),
        };

        allTransactions.push(transactionData);
      }
    }

    await db.insert(transactions).values(allTransactions);
    console.log(`Created ${allTransactions.length} transactions`);

    console.log('Creating cash flow records...');
    const allCashFlows = [];
    for (const { period, count } of periods) {
      const range = getDateRange(period);
      for (let i = 0; i < count; i++) {
        const date = getRandomDateInRange(range.start, range.end);
        const inflow = parseFloat(getRandomAmount(1000, 100000));
        const outflow = parseFloat(getRandomAmount(500, 80000));
        const balance = inflow - outflow;

        const cashFlowData = {
          date,
          inflow: inflow.toFixed(2),
          outflow: outflow.toFixed(2),
          balance: balance.toFixed(2),
          description: getRandomElement(descriptions),
          shift: getRandomElement(shifts),
        };

        allCashFlows.push(cashFlowData);
      }
    }

    await db.insert(cashFlow).values(allCashFlows);
    console.log(`Created ${allCashFlows.length} cash flow records`);

    console.log('\n✅ Seeding completed successfully!');
    console.log(`Total data points created: ${customerData.length + supplierData.length + allTransactions.length + allCashFlows.length}`);
    console.log(`  - Customers: ${customerData.length}`);
    console.log(`  - Suppliers: ${supplierData.length}`);
    console.log(`  - Transactions: ${allTransactions.length}`);
    console.log(`  - Cash Flows: ${allCashFlows.length}`);
    
    process.exit(0);
  } catch (e) {
    console.error('Seeding failed:', e);
    process.exit(1);
  }
}

main().catch(console.error);
