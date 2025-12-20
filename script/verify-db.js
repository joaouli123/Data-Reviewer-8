import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    console.log('✅ Connected to database\n');

    // Get table info
    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    
    console.log('📋 Tables found:');
    for (const row of tables.rows) {
      console.log(`  - ${row.table_name}`);
    }

    console.log('\n📊 Data counts:');
    
    const users = await client.query(`SELECT COUNT(*) as count FROM users`);
    console.log(`  - Users: ${users.rows[0].count}`);

    const customers = await client.query(`SELECT COUNT(*) as count FROM customers`);
    console.log(`  - Customers: ${customers.rows[0].count}`);

    const suppliers = await client.query(`SELECT COUNT(*) as count FROM suppliers`);
    console.log(`  - Suppliers: ${suppliers.rows[0].count}`);

    const transactions = await client.query(`SELECT COUNT(*) as count FROM transactions`);
    console.log(`  - Transactions: ${transactions.rows[0].count}`);

    const cashFlow = await client.query(`SELECT COUNT(*) as count FROM cash_flow`);
    console.log(`  - Cash Flow records: ${cashFlow.rows[0].count}`);

    // Sample data
    console.log('\n🎯 Sample data:');
    
    const sampleCustomers = await client.query(`SELECT id, name, email, status FROM customers LIMIT 2`);
    console.log('\n  Recent Customers:');
    for (const row of sampleCustomers.rows) {
      console.log(`    - ${row.name} (${row.email}) - ${row.status}`);
    }

    const sampleTransactions = await client.query(
      `SELECT id, type, amount, date, status FROM transactions ORDER BY date DESC LIMIT 2`
    );
    console.log('\n  Recent Transactions:');
    for (const row of sampleTransactions.rows) {
      console.log(`    - ${row.type}: R$ ${parseFloat(row.amount).toFixed(2)} (${row.status}) on ${row.date.toLocaleDateString('pt-BR')}`);
    }

    console.log('\n✅ Database verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
