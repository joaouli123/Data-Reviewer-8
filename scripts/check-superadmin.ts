import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);

try {
  const result = await sql`SELECT COUNT(*) as count FROM users WHERE username = 'superadmin'`;
  console.log('✅ SuperAdmin exists:', result[0].count > 0 ? 'YES ✓' : 'NO ✗');
  
  if (result[0].count > 0) {
    const user = await sql`SELECT username, email, is_super_admin FROM users WHERE username = 'superadmin'`;
    console.log('\n👤 User details:');
    console.log('  Username:', user[0].username);
    console.log('  Email:', user[0].email);
    console.log('  Super Admin:', user[0].is_super_admin);
  }
} catch (error) {
  console.error('❌ Error checking database:', error.message);
}

process.exit(0);
