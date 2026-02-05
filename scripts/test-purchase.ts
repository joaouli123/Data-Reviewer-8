/**
 * Script para testar criação de compra parcelada
 * Executa: npx tsx scripts/test-purchase.ts
 */

import 'dotenv/config';
import { db } from '../server/db';
import { transactions } from '../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

async function testPurchaseInstallments() {
  console.log('🧪 Teste: Verificando últimas parcelas criadas...\n');

  // Buscar o grupo de parcelas mais recente
  const latestGroup = await db.execute(sql`
    SELECT installment_group, COUNT(*) as count
    FROM transactions 
    WHERE installment_group IS NOT NULL 
      AND installment_total > 1
    GROUP BY installment_group
    ORDER BY MAX(created_at) DESC
    LIMIT 1
  `);

  const groupRows = (latestGroup as any).rows || [];
  
  if (groupRows.length === 0) {
    console.log('❌ Nenhum grupo de parcelas encontrado');
    process.exit(1);
  }

  const groupId = groupRows[0].installment_group;
  console.log(`📋 Grupo mais recente: ${groupId}`);
  console.log(`📋 Total de parcelas: ${groupRows[0].count}\n`);

  // Buscar todas as parcelas do grupo
  const parcelas = await db.select()
    .from(transactions)
    .where(eq(transactions.installmentGroup, groupId))
    .orderBy(transactions.installmentNumber);

  console.log('📅 Datas das parcelas:');
  console.log('─'.repeat(60));
  
  const dates: string[] = [];
  for (const parcela of parcelas) {
    const dateStr = parcela.date 
      ? `${parcela.date.getFullYear()}-${String(parcela.date.getMonth() + 1).padStart(2, '0')}-${String(parcela.date.getDate()).padStart(2, '0')}`
      : '(sem data)';
    dates.push(dateStr);
    console.log(`   Parcela ${parcela.installmentNumber}/${parcela.installmentTotal}: ${dateStr} - ${parcela.description}`);
  }

  // Verificar se as datas são diferentes
  const uniqueDates = [...new Set(dates)];
  
  console.log('─'.repeat(60));
  
  if (uniqueDates.length === 1) {
    console.log(`\n❌ ERRO: Todas as ${parcelas.length} parcelas têm a MESMA data!`);
    console.log(`   Isso significa que as datas NÃO estão sendo salvas corretamente.`);
    process.exit(1);
  } else {
    console.log(`\n✅ SUCESSO: ${uniqueDates.length} datas diferentes para ${parcelas.length} parcelas`);
    console.log(`   As datas estão sendo distribuídas corretamente por mês.`);
  }

  process.exit(0);
}

testPurchaseInstallments().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
