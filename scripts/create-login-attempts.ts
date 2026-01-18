import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);

console.log('🔧 Criando tabela login_attempts...\n');

try {
  await sql`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
      ip_address TEXT NOT NULL,
      username TEXT NOT NULL,
      success BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
  console.log('✅ Tabela login_attempts criada!');
  
  await sql`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)`;
  console.log('✅ Índice idx_login_attempts_ip criado!');
  
  await sql`CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at)`;
  console.log('✅ Índice idx_login_attempts_created criado!');
  
  console.log('\n✅ Tabela login_attempts configurada com sucesso!');
  console.log('Agora você pode fazer login! 🎉\n');
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}

process.exit(0);
