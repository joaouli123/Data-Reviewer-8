import { db } from './server/db';
import { customers, suppliers, transactions } from './shared/schema';
import { eq } from 'drizzle-orm';

async function checkData() {
  console.log('🔍 Verificando dados por empresa...\n');
  
  // Super Admin company
  const superAdminCompany = 'dc11397f-054f-4406-a544-4e5417bb1b5d';
  console.log('Super Admin Company:', superAdminCompany);
  
  const superAdminCustomers = await db.select().from(customers).where(eq(customers.companyId, superAdminCompany));
  console.log(`  Clientes: ${superAdminCustomers.length}`);
  
  // Admin User company
  const adminUserCompany = '03230649-02c4-447e-bfe0-df04142e272a';
  console.log('\nAdmin User Company:', adminUserCompany);
  
  const adminUserCustomers = await db.select().from(customers).where(eq(customers.companyId, adminUserCompany));
  console.log(`  Clientes: ${adminUserCustomers.length}`);
  
  // Check all customers
  const allCustomers = await db.select().from(customers);
  console.log(`\nTotal de clientes em todo o banco: ${allCustomers.length}`);
  
  process.exit(0);
}

checkData();
