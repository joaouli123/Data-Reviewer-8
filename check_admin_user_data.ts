import { db } from './server/db';
import { customers, suppliers, transactions, sales, purchases } from './shared/schema';
import { eq } from 'drizzle-orm';

async function checkData() {
  console.log('🔍 Verificando dados da empresa admin_user...\n');
  
  const adminUserCompanyId = '03230649-02c4-447e-bfe0-df04142e272a';
  
  const [custos, sups, trans, sal, purch] = await Promise.all([
    db.select().from(customers).where(eq(customers.companyId, adminUserCompanyId)),
    db.select().from(suppliers).where(eq(suppliers.companyId, adminUserCompanyId)),
    db.select().from(transactions).where(eq(transactions.companyId, adminUserCompanyId)),
    db.select().from(sales).where(eq(sales.companyId, adminUserCompanyId)),
    db.select().from(purchases).where(eq(purchases.companyId, adminUserCompanyId)),
  ]);
  
  console.log(`Clientes: ${custos.length}`);
  console.log(`Fornecedores: ${sups.length}`);
  console.log(`Transações: ${trans.length}`);
  console.log(`Vendas: ${sal.length}`);
  console.log(`Compras: ${purch.length}`);
  
  if (trans.length > 0) {
    console.log('\n📋 Primeiras transações:');
    trans.slice(0, 3).forEach(t => {
      console.log(`  - ${t.description}: R$ ${t.amount} (${t.type})`);
    });
  }
  
  process.exit(0);
}

checkData();
