import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function resetPasswords() {
  const saltRounds = 10;
  
  // Super Admin password
  const superAdminPass = await bcrypt.hash('superadmin123', saltRounds);
  await db.update(users)
    .set({ passwordHash: superAdminPass })
    .where(eq(users.username, 'admin'));

  // Admin User password
  const adminUserPass = await bcrypt.hash('admin123456', saltRounds);
  await db.update(users)
    .set({ passwordHash: adminUserPass })
    .where(eq(users.username, 'admin_user'));

  console.log('✅ Senhas resetadas:\n');
  console.log('Super Admin:');
  console.log('  Username: admin');
  console.log('  Email: jl.uli1996@gmail.com');
  console.log('  Password: superadmin123\n');
  
  console.log('Admin User (Empresa vazia):');
  console.log('  Username: admin_user');
  console.log('  Password: admin123456\n');
  
  process.exit(0);
}

resetPasswords().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
