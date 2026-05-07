const { Client } = require('pg');
require('dotenv').config();

async function checkSessions() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://homura_user:homura123@localhost:5432/attendance_db',
  });
  await client.connect();
  const res = await client.query(`SELECT id, created_at, created_at::text as raw_text FROM sessions ORDER BY created_at DESC LIMIT 3`);
  console.log('Sessions in DB:');
  res.rows.forEach(r => {
    console.log('  id:', r.id);
    console.log('  created_at (JS Date):', r.created_at);
    console.log('  created_at (raw text):', r.raw_text);
    console.log('  typeof created_at:', typeof r.created_at);
    console.log('---');
  });
  await client.end();
}
checkSessions().catch(console.error);
