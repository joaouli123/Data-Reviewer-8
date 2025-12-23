import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function fixPasswords() {
  try {
    const saltRounds = 10;
    
    // Update super admin
    const superAdminHash = await bcrypt.hash('superadmin123', saltRounds);
    const result1 = await db.update(users)
      .set({ passwordHash: superAdminHash })
      .where(eq(users.email, 'jl.uli1996@gmail.com'))
      .returning();
    
    console.log('✅ Super Admin atualizado:', result1[0]?.email);
    
    // Update admin_user
    const adminUserHash = await bcrypt.hash('admin123456', saltRounds);
    const result2 = await db.update(users)
      .set({ passwordHash: adminUserHash })
      .where(eq(users.username, 'admin_user'))
      .returning();
    
    console.log('✅ Admin User atualizado:', result2[0]?.username);
    
    console.log('\n📝 Credenciais de Login:\n');
    console.log('Super Admin:');
    console.log('  Username: admin');
    console.log('  Senha: superadmin123\n');
    
    console.log('Admin User (empresa vazia):');
    console.log('  Username: admin_user');
    console.log('  Senha: admin123456\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

fixPasswords();
