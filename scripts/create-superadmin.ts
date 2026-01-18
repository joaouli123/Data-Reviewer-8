import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);

console.log('👤 Criando SuperAdmin...\n');

try {
  // Verificar se já existe
  const existing = await sql`SELECT username FROM users WHERE username = 'superadmin'`;
  
  if (existing.length > 0) {
    console.log('⚠️  SuperAdmin já existe!');
    console.log('   Username: superadmin');
    console.log('   Para resetar a senha, delete o usuário e rode o script novamente.\n');
    process.exit(0);
  }

  // Criar superadmin
  await sql`
    INSERT INTO users (
      id,
      company_id,
      username,
      email,
      password,
      name,
      role,
      is_super_admin,
      permissions,
      status,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid()::text,
      NULL,
      'superadmin',
      'admin@huacontrol.com',
      '$2b$10$HxjBWp.jPKu0U0W9gdmsGuvR.ZdGSqoQJpy48mzfHXpEPe3UpANpu',
      'Super Administrador',
      'admin',
      true,
      '{"manage_users":true,"manage_companies":true,"view_all":true,"delete_all":true}'::jsonb,
      'active',
      now(),
      now()
    )
  `;

  console.log('✅ SuperAdmin criado com sucesso!\n');
  console.log('═══════════════════════════════════════════');
  console.log('🔑 CREDENCIAIS:');
  console.log('═══════════════════════════════════════════');
  console.log('👤 Username: superadmin');
  console.log('🔐 Password: superadmin');
  console.log('📧 Email: admin@huacontrol.com');
  console.log('═══════════════════════════════════════════\n');
  console.log('✅ Agora você pode fazer login! 🎉\n');

} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}

process.exit(0);
