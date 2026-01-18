// Script de diagnóstico para Railway
// Este script verifica a saúde do banco de dados

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔍 DIAGNÓSTICO DO BANCO DE DADOS');
console.log('=====================================');
console.log('DATABASE_URL:', DATABASE_URL ? '✅ SET' : '❌ NOT SET');
console.log('DATABASE_URL preview:', DATABASE_URL ? DATABASE_URL.substring(0, 30) + '...' : 'N/A');

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não está definida!');
  process.exit(1);
}

try {
  const sql = neon(DATABASE_URL);
  
  console.log('\n📊 Testando conexão...');
  const result = await sql`SELECT current_database(), current_user, version()`;
  console.log('✅ Conexão OK!');
  console.log('   Database:', result[0].current_database);
  console.log('   User:', result[0].current_user);
  
  console.log('\n📋 Verificando tabelas...');
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  console.log(`✅ ${tables.length} tabelas encontradas:`);
  tables.forEach(t => console.log(`   - ${t.table_name}`));
  
  console.log('\n👤 Verificando superadmin...');
  const users = await sql`SELECT username, email, is_super_admin FROM users WHERE username = 'superadmin'`;
  if (users.length > 0) {
    console.log('✅ SuperAdmin encontrado:');
    console.log('   Username:', users[0].username);
    console.log('   Email:', users[0].email);
    console.log('   Is Super Admin:', users[0].is_super_admin);
  } else {
    console.log('❌ SuperAdmin NÃO encontrado!');
  }
  
  console.log('\n✅ Diagnóstico completo!');
} catch (error) {
  console.error('\n❌ ERRO:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
