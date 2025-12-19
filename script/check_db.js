import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function main() {
  try {
    const client = await pool.connect();
    console.log("Connected to DB");
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const tables = res.rows.map(r => r.table_name);
    console.log("Tables found:", tables);
    if (tables.includes('users')) {
      try {
        // Assume users table has username/password cols, or maybe name/email?
        // I'll try generic insert or skip if it fails.
        // If I don't know columns, I can query them too.
        // But for now, just logging tables is the main check.
        console.log("Users table exists.");
      } catch (e) { console.log("Skipping users seed: " + e.message); }
    }
    client.release();
  } catch (err) { console.error("DB Error:", err); } finally { pool.end(); }
}
main();
