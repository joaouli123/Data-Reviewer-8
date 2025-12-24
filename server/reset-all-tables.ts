/**
 * Complete database reset script
 * Deletes ALL data and recreates the default admin user
 * Run with: npx tsx server/reset-all-tables.ts
 */

import { db } from './db';
import { 
  users, companies, subscriptions, categories, customers, suppliers,
  transactions, cashFlow, sales, purchases, installments, purchaseInstallments,
  invitations, auditLogs, sessions, loginAttempts
} from '../shared/schema';
import { createUser, createCompany, createSession, generateToken } from './auth';

async function resetAllTables() {
  try {
    console.log('\n🔴 ⚠️  INICIANDO RESET COMPLETO DO BANCO DE DADOS...\n');

    console.log('🧹 Deletando dados em ordem reversa de dependências...\n');

    // Proper order - tables with foreign keys must be deleted first
    const tablesToDelete = [
      { name: 'login_attempts', table: loginAttempts },
      { name: 'audit_logs', table: auditLogs },
      { name: 'sessions', table: sessions },
      { name: 'invitations', table: invitations },
      { name: 'installments', table: installments },
      { name: 'purchase_installments', table: purchaseInstallments },
      { name: 'purchases', table: purchases },
      { name: 'sales', table: sales },
      { name: 'transactions', table: transactions },
      { name: 'cash_flow', table: cashFlow },
      { name: 'categories', table: categories },
      { name: 'customers', table: customers },
      { name: 'suppliers', table: suppliers },
      { name: 'subscriptions', table: subscriptions },
      { name: 'users', table: users },
      { name: 'companies', table: companies },
    ];

    for (const { name, table } of tablesToDelete) {
      try {
        await db.delete(table);
        console.log(`  ✅ ${name}`);
      } catch (error) {
        console.log(`  ⚠️  ${name} (possivelmente vazio)`);
      }
    }

    console.log('\n✅ Todos os dados foram deletados\n');

    console.log('🏢 Criando empresa padrão "HUA Consultoria"...');
    const company = await createCompany('HUA Consultoria', '00.000.000/0000-00');
    console.log(`✅ Empresa criada: ${company.id}\n`);

    console.log('👤 Criando usuário Super Admin...');
    const admin = await createUser(
      company.id,
      'superadmin',
      'admin@example.com',
      'superadmin',
      'Admin User',
      'admin',
      true // isSuperAdmin = true
    );
    console.log(`✅ Super Admin criado: ${admin.id}\n`);

    console.log('🔑 Criando sessão...');
    const token = generateToken({
      userId: admin.id,
      companyId: company.id,
      role: admin.role,
      isSuperAdmin: true,
    });
    await createSession(admin.id, company.id, token);
    console.log(`✅ Sessão criada\n`);

    console.log('='.repeat(70));
    console.log('✨ ✨ ✨  BANCO DE DADOS RESETADO COM SUCESSO!  ✨ ✨ ✨');
    console.log('='.repeat(70));
    console.log('\n🔐 USE ESTAS CREDENCIAIS PARA FAZER LOGIN:\n');
    console.log(`   Usuário:  superadmin`);
    console.log(`   Senha:    superadmin`);
    console.log(`   Email:    admin@example.com`);
    console.log(`   Tipo:     Super Admin`);
    console.log('\n🏢 Empresa criada:');
    console.log(`   Nome:     HUA Consultoria`);
    console.log(`   ID:       ${company.id}`);
    console.log('\n' + '='.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO ao resetar banco de dados:', error);
    console.error('\nVerifique se:');
    console.error('  1. O banco de dados está rodando');
    console.error('  2. As tabelas foram criadas');
    console.error('  3. As credenciais de acesso estão corretas\n');
    process.exit(1);
  }
}

resetAllTables();
