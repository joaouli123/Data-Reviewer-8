import { db } from './db';
import { 
  users, companies, subscriptions, categories, customers, suppliers,
  transactions, cashFlow, sales, purchases, installments, purchaseInstallments,
  invitations, auditLogs, sessions, loginAttempts
} from '../shared/schema';
import { createUser, createCompany, createSession, generateToken } from './auth';
import bcrypt from 'bcryptjs';

async function resetDatabase() {
  try {
    console.log('🧹 Limpando banco de dados...');
    
    // Delete all data in reverse order of foreign keys
    await db.delete(loginAttempts);
    await db.delete(auditLogs);
    await db.delete(sessions);
    await db.delete(invitations);
    await db.delete(installments);
    await db.delete(purchaseInstallments);
    await db.delete(purchases);
    await db.delete(sales);
    await db.delete(transactions);
    await db.delete(cashFlow);
    await db.delete(categories);
    await db.delete(customers);
    await db.delete(suppliers);
    await db.delete(subscriptions);
    await db.delete(users);
    await db.delete(companies);
    
    console.log('✅ Banco limpo');
    
    console.log('\n🏢 Criando empresa padrão...');
    const company = await createCompany('HUA Consultoria', '00.000.000/0000-00');
    console.log(`✅ Empresa criada: ${company.id}`);
    
    console.log('👤 Criando usuário admin...');
    const admin = await createUser(
      company.id,
      'admin',
      'admin@example.com',
      'senha123456',
      'Admin User',
      'admin',
      true
    );
    console.log(`✅ Admin criado: ${admin.id}`);
    
    console.log('🔑 Gerando token de sessão...');
    const token = generateToken({
      userId: admin.id,
      companyId: company.id,
      role: admin.role,
      isSuperAdmin: true,
    });
    
    await createSession(admin.id, company.id, token);
    console.log(`✅ Sessão criada`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ BANCO DE DADOS RESETADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n🔐 CREDENCIAIS DE ACESSO:\n');
    console.log('Usuário: admin');
    console.log('Senha: senha123456');
    console.log('Email: admin@example.com');
    console.log('Tipo: Super Admin\n');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao resetar banco:', error);
    process.exit(1);
  }
}

resetDatabase();
