/**
 * Script para testar criação de compra via API (simula o frontend)
 * Executa: npx tsx scripts/test-purchase-api.ts
 */

import 'dotenv/config';
import { db } from '../server/db';
import { transactions, companies, suppliers } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { storage } from '../server/storage';

// Simula parseLocalDate do backend
function parseLocalDate(value: string | Date): Date {
  if (!value) return new Date();
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }

  const str = String(value).trim();

  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Simula computeInstallmentDate do backend
function computeInstallmentDate(baseDateStr: string, customInstallments: any[] | undefined, index: number) {
  const baseDate = parseLocalDate(baseDateStr);

  if (customInstallments && customInstallments.length > 0 && customInstallments[index]) {
    const customDate = customInstallments[index].due_date || customInstallments[index].date;
    if (customDate) {
      return parseLocalDate(customDate);
    }
  }

  // Se não tem parcelas customizadas com datas, espalha por meses
  const spread = new Date(baseDate);
  spread.setMonth(baseDate.getMonth() + 1 + index);
  return spread;
}

async function testPurchaseAPI() {
  console.log('🧪 Teste: Simulando criação de compra parcelada via API...\n');

  // Buscar um companyId e supplierId válidos
  const existingCompanies = await db.select().from(companies).limit(1);
  if (existingCompanies.length === 0) {
    console.log('❌ Nenhuma empresa encontrada para teste');
    process.exit(1);
  }
  const companyId = existingCompanies[0].id;
  
  const existingSuppliers = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId)).limit(1);
  const supplierId = existingSuppliers.length > 0 ? existingSuppliers[0].id : null;

  console.log(`📋 companyId: ${companyId}`);
  console.log(`📋 supplierId: ${supplierId}`);

  // Simular customInstallments como o frontend envia
  const purchaseDate = '2026-02-05';
  const numInstallments = 5;
  const totalAmount = 500;
  const amountPerInstallment = totalAmount / numInstallments;
  
  // Gerar customInstallments como o frontend faz
  const baseDate = new Date(2026, 1, 5); // 05/02/2026
  const customInstallments = Array.from({ length: numInstallments }, (_, i) => {
    const targetMonth = baseDate.getMonth() + 1 + i; // +1 para próximo mês
    const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
    const actualMonth = targetMonth % 12;
    const installmentDate = new Date(targetYear, actualMonth, baseDate.getDate());
    
    const yyyy = installmentDate.getFullYear();
    const mm = String(installmentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(installmentDate.getDate()).padStart(2, '0');
    
    return {
      amount: amountPerInstallment,
      due_date: `${yyyy}-${mm}-${dd}`
    };
  });

  console.log('\n📋 customInstallments geradas pelo frontend:');
  customInstallments.forEach((inst, i) => {
    console.log(`   Parcela ${i + 1}: ${inst.due_date} - R$ ${inst.amount}`);
  });

  // Simular como o backend processa
  const installmentGroupId = `test-api-${Date.now()}`;
  
  console.log('\n📋 Criando transações via storage.createTransaction...\n');

  for (let i = 0; i < numInstallments; i++) {
    const dueDate = computeInstallmentDate(purchaseDate, customInstallments, i);
    
    console.log(`   Parcela ${i + 1}: computeInstallmentDate retornou ${dueDate.toISOString().split('T')[0]}`);

    await storage.createTransaction(companyId, {
      companyId,
      type: 'compra',
      description: `API Test ${i + 1}/${numInstallments}`,
      amount: amountPerInstallment.toFixed(2),
      date: dueDate,
      status: 'pendente',
      supplierId,
      installmentNumber: i + 1,
      installmentTotal: numInstallments,
      installmentGroup: installmentGroupId,
      shift: 'Normal'
    });
  }

  console.log('\n📋 Verificando parcelas no banco...\n');

  // Buscar parcelas criadas
  const created = await db.select()
    .from(transactions)
    .where(eq(transactions.installmentGroup, installmentGroupId))
    .orderBy(transactions.installmentNumber);

  const dbDates: string[] = [];
  for (const p of created) {
    const dateVal = p.date;
    let dateStr = '(sem data)';
    
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      dateStr = dateVal.toISOString().split('T')[0];
    } else if (typeof dateVal === 'string') {
      dateStr = String(dateVal).split('T')[0];
    }
    
    dbDates.push(dateStr);
    console.log(`   Parcela ${p.installmentNumber}: ${dateStr}`);
  }

  // Verificar se as datas são diferentes
  const uniqueDates = [...new Set(dbDates)];
  
  console.log('');
  if (uniqueDates.length === 1 || uniqueDates.includes('(sem data)')) {
    console.log(`❌ ERRO: Datas não estão corretas!`);
    console.log(`   Unique dates: ${uniqueDates.join(', ')}`);
  } else if (uniqueDates.length === numInstallments) {
    console.log(`✅ SUCESSO: ${uniqueDates.length} datas diferentes para ${created.length} parcelas!`);
    console.log(`\n🎉 Novas compras parceladas vão funcionar corretamente!`);
  } else {
    console.log(`⚠️ PARCIAL: ${uniqueDates.length} datas diferentes, esperado ${numInstallments}`);
  }

  // Limpar registros de teste
  await db.delete(transactions).where(eq(transactions.installmentGroup, installmentGroupId));
  console.log('\n🧹 Registros de teste removidos.');

  process.exit(0);
}

testPurchaseAPI().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
