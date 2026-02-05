/**
 * Script para verificar o que a API retorna
 */

import 'dotenv/config';
import { db } from '../server/db';
import { transactions } from '../shared/schema';
import { eq, like, or, sql } from 'drizzle-orm';

async function checkAPI() {
  console.log('🔍 Verificando dados como a API retorna (via Drizzle ORM)...\n');

  // Buscar como o Drizzle ORM retorna
  const result = await db.select()
    .from(transactions)
    .where(
      or(
        like(transactions.installmentGroup, 'purchase-%'),
        like(transactions.installmentGroup, 'group-%'),
        like(transactions.installmentGroup, 'sale-%')
      )
    )
    .limit(20);

  console.log(`📋 Encontradas ${result.length} parcelas:\n`);

  for (const row of result) {
    const dateVal = row.date;
    const dateType = typeof dateVal;
    
    let dateDisplay: string;
    if (dateVal === null || dateVal === undefined) {
      dateDisplay = 'NULL';
    } else if (dateVal instanceof Date) {
      if (isNaN(dateVal.getTime())) {
        dateDisplay = 'Date(Invalid)';
      } else {
        dateDisplay = dateVal.toISOString().split('T')[0];
      }
    } else {
      dateDisplay = `${dateType}: ${String(dateVal)}`;
    }

    console.log(`   [${row.installmentNumber}/${row.installmentTotal}] ${row.description}`);
    console.log(`      date value: ${JSON.stringify(dateVal)}`);
    console.log(`      date type: ${dateType}`);
    console.log(`      date display: ${dateDisplay}`);
    console.log('');
  }

  process.exit(0);
}

checkAPI().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
