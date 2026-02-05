import 'dotenv/config';
import { db } from '../server/db';
import { transactions, categories, customers, suppliers } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';

async function testAPI() {
  console.log('🔍 Testando conexão com banco de dados...\n');

  try {
    // Test categories
    console.log('📁 Categorias:');
    const cats = await db.select().from(categories).limit(5);
    console.log(`  Total: ${cats.length}`);
    if (cats.length > 0) {
      console.log(`  Exemplo: ${JSON.stringify(cats[0], null, 2)}`);
    }

    // Test customers
    console.log('\n👥 Clientes:');
    const custs = await db.select().from(customers).limit(5);
    console.log(`  Total: ${custs.length}`);
    if (custs.length > 0) {
      console.log(`  Exemplo: ${custs[0].name}`);
    }

    // Test suppliers
    console.log('\n🏭 Fornecedores:');
    const supps = await db.select().from(suppliers).limit(5);
    console.log(`  Total: ${supps.length}`);
    if (supps.length > 0) {
      console.log(`  Exemplo: ${supps[0].name}`);
    }

    // Test transactions
    console.log('\n💰 Transações:');
    const txs = await db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(5);
    console.log(`  Total: ${txs.length}`);
    if (txs.length > 0) {
      console.log(`  Exemplo:`);
      console.log(`    Description: ${txs[0].description}`);
      console.log(`    Date: ${txs[0].date} (type: ${typeof txs[0].date})`);
      console.log(`    Amount: ${txs[0].amount}`);
      console.log(`    Status: ${txs[0].status}`);
    }

    console.log('\n✅ Todos os testes passaram!');
  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

testAPI();
