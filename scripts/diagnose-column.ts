/**
 * Script para diagnosticar tipo de coluna
 */

import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function diagnose() {
  console.log('🔍 Diagnóstico da coluna date...\n');
  
  // 1. Tipo da coluna no PostgreSQL
  const colInfo = await db.execute(sql`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'transactions'
    AND column_name = 'date'
  `);
  console.log('Tipo da coluna:');
  console.log(JSON.stringify((colInfo as any).rows, null, 2));
  
  // 2. Valores reais
  const values = await db.execute(sql`
    SELECT id, date, pg_typeof(date) as date_type, date::text as date_text
    FROM transactions
    WHERE installment_group IS NOT NULL
    LIMIT 5
  `);
  console.log('\nValores reais no banco:');
  for (const r of (values as any).rows) {
    console.log(`  ${r.id}: ${r.date_text} (${r.date_type})`);
  }
  
  process.exit(0);
}

diagnose().catch(e => { 
  console.error('❌ Erro:', e); 
  process.exit(1); 
});
