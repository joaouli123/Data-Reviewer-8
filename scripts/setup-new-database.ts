import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Carregar .env
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ler a nova DATABASE_URL do .env ou passar como argumento
const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada!');
  console.log('\n📝 Uso:');
  console.log('   npx tsx scripts/setup-new-database.ts');
  console.log('   OU defina DATABASE_URL no .env\n');
  process.exit(1);
}

console.log('🚀 Iniciando configuração do novo banco de dados...\n');

async function setupDatabase() {
  try {
    // Conectar ao banco
    console.log('📡 Conectando ao banco de dados...');
    const sql = neon(DATABASE_URL);
    console.log('✅ Conectado!\n');

    // Ler o script SQL
    const sqlFile = path.join(__dirname, '..', 'migrations', 'RESET_DATABASE.sql');
    console.log('📄 Lendo script SQL:', sqlFile);
    
    const sqlScript = fs.readFileSync(sqlFile, 'utf-8');

    // Dividir em comandos individuais (separados por ;)
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && cmd !== '');

    console.log(`\n📋 Encontrados ${commands.length} comandos SQL para executar...\n`);

    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      
      if (cmd.includes('DROP TABLE')) {
        const tableName = cmd.match(/DROP TABLE IF EXISTS (\w+)/)?.[1];
        process.stdout.write(`🗑️  Removendo tabela ${tableName}...`);
      } else if (cmd.includes('CREATE TABLE')) {
        const tableName = cmd.match(/CREATE TABLE (\w+)/)?.[1];
        process.stdout.write(`✨ Criando tabela ${tableName}...`);
      } else if (cmd.includes('CREATE INDEX')) {
        const indexName = cmd.match(/CREATE INDEX (\w+)/)?.[1];
        process.stdout.write(`🔍 Criando índice ${indexName}...`);
      } else if (cmd.includes('INSERT INTO')) {
        process.stdout.write(`👤 Criando SuperAdmin...`);
      } else if (cmd.includes('SELECT')) {
        // Pular SELECTs de verificação
        continue;
      } else {
        process.stdout.write(`⚙️  Executando comando ${i + 1}...`);
      }

      try {
        await sql(cmd);
        console.log(' ✅');
      } catch (err) {
        // Ignorar erros de "does not exist" ao dropar tabelas
        if (err.message && err.message.includes('does not exist')) {
          console.log(' ⏭️  (já removida)');
        } else {
          console.log(' ❌');
          console.error('Erro:', err.message);
        }
      }
    }

    // Verificar se superadmin foi criado
    console.log('\n🔍 Verificando SuperAdmin...');
    const result = await sql`
      SELECT username, email, is_super_admin, name 
      FROM users 
      WHERE username = 'superadmin'
    `;

    if (result.length > 0) {
      const superadmin = result[0];
      console.log('\n✅ BANCO DE DADOS CONFIGURADO COM SUCESSO!\n');
      console.log('═══════════════════════════════════════════');
      console.log('📊 INFORMAÇÕES DO BANCO:');
      console.log('═══════════════════════════════════════════');
      
      // Contar tabelas
      const tables = await sql`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      console.log(`📁 Tabelas criadas: ${tables[0].count}`);
      
      console.log('\n═══════════════════════════════════════════');
      console.log('🔑 CREDENCIAIS DO SUPERADMIN:');
      console.log('═══════════════════════════════════════════');
      console.log(`👤 Username: ${superadmin.username}`);
      console.log(`📧 Email: ${superadmin.email}`);
      console.log(`🔐 Password: superadmin`);
      console.log(`⭐ Super Admin: ${superadmin.is_super_admin ? 'Sim' : 'Não'}`);
      console.log(`📝 Nome: ${superadmin.name}`);
      console.log('═══════════════════════════════════════════\n');
      
      console.log('✅ Agora você pode fazer login no sistema!\n');
    } else {
      console.log('\n⚠️  SuperAdmin não foi criado. Verifique o script SQL.\n');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERRO ao configurar banco de dados:');
    console.error(error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  }
}

setupDatabase();
