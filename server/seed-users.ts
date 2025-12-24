import { createUser, createCompany, generateToken, createSession } from './auth';
import { db } from './db';
import { subscriptions, DEFAULT_PERMISSIONS } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function seedDatabase() {
  try {
    console.log('🏢 Criando empresa...');
    const company = await createCompany('Empresa Teste', '11.111.111/0001-11');
    console.log(`✅ Empresa criada: ${company.name} (${company.id})`);
    
    // Atualizar subscription para plano pro
    console.log('📋 Configurando plano pro...');
    await db.update(subscriptions)
      .set({ plan: 'pro', status: 'active' })
      .where(eq(subscriptions.companyId, company.id));
    console.log(`✅ Plano: Pro`);
    
    // 1. Super Admin
    console.log('\n👤 Criando Super Admin...');
    const superAdmin = await createUser(
      company.id,
      'superadmin',
      'superadmin@example.com',
      'senha123456',
      'Super Admin',
      'admin',
      true // É super admin
    );
    console.log(`✅ Super Admin criado!`);
    
    const superAdminToken = generateToken({
      userId: superAdmin.id,
      companyId: company.id,
      role: superAdmin.role,
      isSuperAdmin: true,
    });
    await createSession(superAdmin.id, company.id, superAdminToken);
    
    // 2. Admin
    console.log('\n👤 Criando Admin...');
    const admin = await createUser(
      company.id,
      'admin',
      'admin@example.com',
      'senha123456',
      'Admin User',
      'admin',
      false // Não é super admin
    );
    console.log(`✅ Admin criado!`);
    
    const adminToken = generateToken({
      userId: admin.id,
      companyId: company.id,
      role: admin.role,
      isSuperAdmin: false,
    });
    await createSession(admin.id, company.id, adminToken);
    
    // 3. Operational
    console.log('\n👤 Criando Operacional...');
    const operational = await createUser(
      company.id,
      'operacional',
      'operacional@example.com',
      'senha123456',
      'Operacional User',
      'operational',
      false // Não é super admin
    );
    console.log(`✅ Operacional criado!`);
    
    const operationalToken = generateToken({
      userId: operational.id,
      companyId: company.id,
      role: operational.role,
      isSuperAdmin: false,
    });
    await createSession(operational.id, company.id, operationalToken);
    
    console.log('\n' + '='.repeat(50));
    console.log('✨ BANCO DE DADOS CRIADO COM SUCESSO!');
    console.log('='.repeat(50));
    
    console.log('\n🔐 CREDENCIAIS DE ACESSO:\n');
    
    console.log('1️⃣ SUPER ADMIN');
    console.log(`   Usuário: superadmin`);
    console.log(`   Senha: senha123456`);
    console.log(`   Email: superadmin@example.com`);
    
    console.log('\n2️⃣ ADMIN');
    console.log(`   Usuário: admin`);
    console.log(`   Senha: senha123456`);
    console.log(`   Email: admin@example.com`);
    
    console.log('\n3️⃣ OPERACIONAL');
    console.log(`   Usuário: operacional`);
    console.log(`   Senha: senha123456`);
    console.log(`   Email: operacional@example.com`);
    
    console.log('\n' + '='.repeat(50));
    console.log('Empresa ID:', company.id);
    console.log('='.repeat(50) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar banco:', error);
    process.exit(1);
  }
}

seedDatabase();
