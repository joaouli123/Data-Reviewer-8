/**
 * Script para corrigir datas de parcelas que estão todas no mesmo mês
 * Executa: npx tsx scripts/fix-installment-dates.ts
 */

import 'dotenv/config';
import { db } from '../server/db';
import { transactions } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

// Função auxiliar para formatar data de forma segura
function formatDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function fixInstallmentDates() {
  console.log('🔧 Iniciando correção de datas de parcelas...\n');

  // Buscar todos os grupos de parcelas
  const groups = await db.execute(sql`
    SELECT installment_group, MIN(created_at) as first_created
    FROM transactions 
    WHERE installment_group IS NOT NULL 
      AND installment_total > 1
    GROUP BY installment_group
    ORDER BY first_created DESC
  `);

  const installmentGroups = (groups as any).rows || [];
  console.log(`📋 Encontrados ${installmentGroups.length} grupos de parcelas para verificar.\n`);

  let fixedCount = 0;
  let groupsFixed = 0;

  for (const row of installmentGroups) {
    const groupId = row.installment_group;
    
    // Buscar todas as parcelas do grupo
    const parcelas = await db.select()
      .from(transactions)
      .where(eq(transactions.installmentGroup, groupId))
      .orderBy(transactions.installmentNumber);

    if (parcelas.length < 2) continue;

    // Verificar se todas as parcelas têm a mesma data (problema)
    const dates = parcelas.map(p => formatDate(p.date));
    const validDates = dates.filter(Boolean);
    const uniqueDates = [...new Set(validDates)];
    
    // Se não há datas válidas ou todas são iguais, precisamos corrigir
    const needsFix = uniqueDates.length <= 1;
    
    if (needsFix) {
      const displayDate = uniqueDates[0] || '(sem data válida)';
      console.log(`❌ Grupo ${groupId}: ${parcelas.length} parcelas com mesma data (${displayDate})`);
      
      // Pegar a data base - primeira parcela válida ou data de criação
      let baseDate: Date;
      const firstValidParcela = parcelas.find(p => p.date && !isNaN(p.date.getTime()));
      
      if (firstValidParcela && firstValidParcela.date) {
        baseDate = new Date(firstValidParcela.date);
      } else if (parcelas[0].createdAt) {
        baseDate = new Date(parcelas[0].createdAt);
      } else {
        baseDate = new Date(); // Fallback para hoje
      }
      
      // Verificar se baseDate é válida
      if (isNaN(baseDate.getTime())) {
        baseDate = new Date();
      }
      
      const baseDayOfMonth = baseDate.getDate();
      console.log(`   📅 Data base: ${formatDate(baseDate)}`);

      // Corrigir cada parcela
      for (let i = 0; i < parcelas.length; i++) {
        const parcela = parcelas[i];
        const installmentNum = parcela.installmentNumber || (i + 1);
        
        // Calcular nova data: base + (número da parcela) meses
        // Primeira parcela = +1 mês, segunda = +2 meses, etc.
        const newDate = new Date(baseDate);
        newDate.setMonth(baseDate.getMonth() + installmentNum);
        
        // Ajustar o dia se necessário (ex: dia 31 em um mês de 30 dias)
        const lastDayOfMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
        if (baseDayOfMonth > lastDayOfMonth) {
          newDate.setDate(lastDayOfMonth);
        } else {
          newDate.setDate(baseDayOfMonth);
        }

        const oldDateStr = formatDate(parcela.date) || '(sem data)';
        const newDateStr = formatDate(newDate);

        // Atualizar no banco
        await db.update(transactions)
          .set({ date: newDate })
          .where(eq(transactions.id, parcela.id));

        console.log(`   ✅ Parcela ${installmentNum}/${parcelas.length}: ${oldDateStr} → ${newDateStr}`);
        fixedCount++;
      }
      
      groupsFixed++;
      console.log('');
    } else {
      console.log(`✅ Grupo ${groupId}: ${parcelas.length} parcelas com datas diferentes (OK)`);
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`   Grupos verificados: ${installmentGroups.length}`);
  console.log(`   Grupos corrigidos: ${groupsFixed}`);
  console.log(`   Parcelas corrigidas: ${fixedCount}`);
  console.log('\n✨ Correção concluída!');

  process.exit(0);
}

fixInstallmentDates().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
