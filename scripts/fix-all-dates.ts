/**
 * Script para corrigir TODAS as datas das parcelas via SQL direto
 */

import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function fixAllDates() {
  console.log('🔧 Corrigindo TODAS as datas das parcelas...\n');
  
  // Buscar todos os grupos de parcelas
  const groups = await db.execute(sql`
    SELECT DISTINCT installment_group
    FROM transactions 
    WHERE installment_group IS NOT NULL 
    AND installment_total > 1
  `);
  
  const rows = (groups as any).rows || [];
  console.log(`📋 ${rows.length} grupos encontrados\n`);
  
  let fixed = 0;
  
  for (const group of rows) {
    const groupId = group.installment_group;
    
    // Atualizar cada parcela: data = base + (número da parcela) meses
    // Usa created_at como data base e adiciona installment_number meses
    await db.execute(sql`
      UPDATE transactions 
      SET date = (
        DATE_TRUNC('month', created_at) + INTERVAL '1 month' * installment_number
      )::timestamp
      WHERE installment_group = ${groupId}
    `);
    
    fixed++;
  }
  
  console.log(`✅ ${fixed} grupos corrigidos\n`);
  
  console.log('📋 Verificando resultado:\n');
  const check = await db.execute(sql`
    SELECT description, installment_number, installment_total, date::text as date_str
    FROM transactions 
    WHERE installment_group IS NOT NULL 
    AND installment_total > 1
    ORDER BY created_at DESC, installment_number
    LIMIT 20
  `);
  
  for (const r of (check as any).rows) {
    console.log(`   [${r.installment_number}/${r.installment_total}] ${r.date_str} - ${r.description}`);
  }
  
  process.exit(0);
}

fixAllDates().catch(e => { 
  console.error('❌ Erro:', e); 
  process.exit(1); 
});
