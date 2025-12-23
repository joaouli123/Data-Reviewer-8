import { db } from './server/db';
import { users, companies } from './shared/schema';
import bcrypt from 'bcryptjs';

async function createUsers() {
  // Criar 2 empresas de teste
  const [company1, company2] = await db.insert(companies).values([
    { name: 'Empresa Super Admin' },
    { name: 'Empresa Teste' }
  ]).returning();

  // Criar senha hash
  const saltRounds = 10;
  
  // Super Admin
  const superAdminPass = await bcrypt.hash('superadmin123', saltRounds);
  const superAdmin = await db.insert(users).values({
    username: 'jl.uli1996@gmail.com',
    email: 'jl.uli1996@gmail.com',
    passwordHash: superAdminPass,
    role: 'admin',
    isSuperAdmin: true,
    companyId: company1.id
  }).returning();

  // Admin User
  const adminPass = await bcrypt.hash('admin123456', saltRounds);
  const adminUser = await db.insert(users).values({
    username: 'admin_user',
    email: 'admin@company.com',
    passwordHash: adminPass,
    role: 'admin',
    isSuperAdmin: false,
    companyId: company2.id
  }).returning();

  console.log('✅ Usuários criados:\n');
  console.log('Super Admin:');
  console.log('  Username: jl.uli1996@gmail.com');
  console.log('  Password: superadmin123');
  console.log('  Role: Super Admin\n');
  
  console.log('Admin User:');
  console.log('  Username: admin_user');
  console.log('  Password: admin123456');
  console.log('  Role: Admin (Empresa vazia)\n');
  
  process.exit(0);
}

createUsers().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
