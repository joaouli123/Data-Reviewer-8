/**
 * Script para diagnosticar problema com datas das parcelas
 * Executa: npx tsx scripts/diagnose-dates.ts
 */

import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function diagnoseDates() {
  console.log('🔍 Diagnóstico: Verificando datas das parcelas no banco...\n');

  // Buscar as parcelas mais recentes
  const result = await db.execute(sql`
    SELECT id, description, date, created_at, installment_number, installment_total, installment_group
    FROM transactions 
    WHERE installment_group IS NOT NULL 
      AND installment_total > 1
    ORDER BY created_at DESC
    LIMIT 15
  `);

  const rows = (result as any).rows || [];
  
  console.log(`📋 Encontradas ${rows.length} parcelas recentes:\n`);
  console.log('─'.repeat(100));

  for (const row of rows) {
    const dateVal = row.date;
    const dateType = typeof dateVal;
    const dateStr = dateVal === null ? 'NULL' : 
                    dateVal === undefined ? 'UNDEFINED' :
                    dateVal instanceof Date ? (isNaN(dateVal.getTime()) ? 'Date(Invalid)' : dateVal.toISOString()) :
                    `${dateType}: ${String(dateVal)}`;
    
    console.log(`   [${row.installment_number}/${row.installment_total}] ${row.description}`);
    console.log(`      ID: ${row.id}`);
    console.log(`      Date value: ${dateStr}`);
    console.log(`      Date typeof: ${dateType}`);
    console.log(`      Created: ${row.created_at}`);
    console.log('');
  }

  console.log('─'.repeat(100));
  console.log('\n🔧 Verificando se o UPDATE funcionou...');
  
  // Tentar um UPDATE simples e verificar
  const testUpdate = await db.execute(sql`
    UPDATE transactions 
    SET date = NOW()
    WHERE id = (
      SELECT id FROM transactions 
      WHERE installment_group IS NOT NULL 
        AND installment_total > 1
      ORDER BY created_at DESC 
      LIMIT 1
    )
    RETURNING id, date
  `);
  
  const updated = (testUpdate as any).rows || [];
  if (updated.length > 0) {
    console.log(`   ✅ UPDATE funcionou! ID: ${updated[0].id}, Date: ${updated[0].date}`);
  } else {
    console.log('   ❌ UPDATE não retornou nenhum resultado');
  }

  process.exit(0);
}

diagnoseDates().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
