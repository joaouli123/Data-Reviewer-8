/**
 * Script para verificar diretamente SQL - sem Drizzle ORM
 */

import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function directSQL() {
  console.log('🔍 Verificando parcelas diretamente via SQL...\n');

  // Buscar as últimas parcelas criadas
  const result = await db.execute(sql`
    SELECT 
      id, 
      description, 
      date,
      date::text as date_text,
      installment_number, 
      installment_total, 
      installment_group
    FROM transactions 
    WHERE installment_group LIKE 'purchase-%' 
       OR installment_group LIKE 'group-%'
       OR installment_group LIKE 'sale-%'
    ORDER BY created_at DESC
    LIMIT 20
  `);

  const rows = (result as any).rows || [];
  
  console.log(`📋 Encontradas ${rows.length} parcelas:\n`);

  for (const row of rows) {
    console.log(`   [${row.installment_number}/${row.installment_total}] ${row.description}`);
    console.log(`      date (raw): ${row.date}`);
    console.log(`      date (text): ${row.date_text}`);
    console.log('');
  }

  process.exit(0);
}

directSQL().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
