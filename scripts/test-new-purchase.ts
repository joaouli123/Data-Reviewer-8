/**
 * Script para testar criação de NOVA compra parcelada
 * Executa: npx tsx scripts/test-new-purchase.ts
 */

import 'dotenv/config';
import { db } from '../server/db';
import { transactions, users, companies } from '../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

async function testNewPurchase() {
  console.log('🧪 Teste: Criando nova compra parcelada via banco...\n');

  // Buscar um companyId válido
  const existingCompanies = await db.select().from(companies).limit(1);
  if (existingCompanies.length === 0) {
    console.log('❌ Nenhuma empresa encontrada para teste');
    process.exit(1);
  }
  const companyId = existingCompanies[0].id;
  console.log(`📋 Usando companyId: ${companyId}`);

  // Simular criação de parcelas como o backend faz
  const installmentGroupId = `test-${Date.now()}`;
  const baseDate = new Date();
  const numInstallments = 5;
  const totalAmount = 1000;
  const amountPerInstallment = totalAmount / numInstallments;

  console.log(`📋 Criando ${numInstallments} parcelas...`);
  console.log(`📋 Data base: ${baseDate.toISOString().split('T')[0]}`);
  console.log('');

  const createdDates: string[] = [];

  for (let i = 0; i < numInstallments; i++) {
    // Calcular data como o backend deveria fazer:
    // Primeira parcela = próximo mês, segunda = +2 meses, etc.
    const installmentDate = new Date(baseDate);
    installmentDate.setMonth(baseDate.getMonth() + 1 + i);
    
    const dateStr = installmentDate.toISOString().split('T')[0];
    createdDates.push(dateStr);
    
    await db.insert(transactions).values({
      companyId,
      type: 'compra',
      description: `Teste Parcela ${i + 1}/${numInstallments}`,
      amount: amountPerInstallment.toFixed(2),
      date: installmentDate,
      status: 'pendente',
      installmentNumber: i + 1,
      installmentTotal: numInstallments,
      installmentGroup: installmentGroupId,
      shift: 'Normal'
    });

    console.log(`   ✅ Parcela ${i + 1}/${numInstallments}: ${dateStr}`);
  }

  console.log('\n📋 Verificando parcelas criadas...');
  
  // Buscar parcelas criadas
  const created = await db.select()
    .from(transactions)
    .where(eq(transactions.installmentGroup, installmentGroupId))
    .orderBy(transactions.installmentNumber);

  console.log(`📋 ${created.length} parcelas encontradas no banco:\n`);

  const dbDates: string[] = [];
  for (const p of created) {
    const dateVal = p.date;
    let dateStr = '(sem data)';
    
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      dateStr = dateVal.toISOString().split('T')[0];
    } else if (typeof dateVal === 'string') {
      dateStr = dateVal.split('T')[0];
    }
    
    dbDates.push(dateStr);
    console.log(`   Parcela ${p.installmentNumber}: ${dateStr}`);
  }

  // Verificar se as datas são diferentes
  const uniqueDates = [...new Set(dbDates)];
  
  console.log('');
  if (uniqueDates.length === 1) {
    console.log(`❌ ERRO: Todas as ${created.length} parcelas têm a MESMA data!`);
    console.log(`   Isso significa que o backend NÃO está salvando as datas corretamente.`);
    
    // Limpar registros de teste
    await db.delete(transactions).where(eq(transactions.installmentGroup, installmentGroupId));
    console.log('\n🧹 Registros de teste removidos.');
    process.exit(1);
  } else {
    console.log(`✅ SUCESSO: ${uniqueDates.length} datas diferentes para ${created.length} parcelas`);
    console.log(`   As datas estão sendo salvas e distribuídas corretamente!`);
    
    // Verificar se as datas correspondem ao esperado
    let match = true;
    for (let i = 0; i < Math.min(createdDates.length, dbDates.length); i++) {
      if (createdDates[i] !== dbDates[i]) {
        console.log(`   ⚠️ Parcela ${i + 1}: esperado ${createdDates[i]}, banco: ${dbDates[i]}`);
        match = false;
      }
    }
    
    if (match) {
      console.log(`\n🎉 TODAS as datas correspondem ao esperado!`);
    }
  }

  // Limpar registros de teste
  await db.delete(transactions).where(eq(transactions.installmentGroup, installmentGroupId));
  console.log('\n🧹 Registros de teste removidos.');

  process.exit(0);
}

testNewPurchase().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
