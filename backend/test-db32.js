const { Client } = require('pg');
async function main() {
  const client = new Client({ user: 'homura_user', host: 'localhost', database: 'attendance_db', password: 'homura123', port: 5432 });
  await client.connect();
  const res = await client.query(`
    SELECT id, session_id, created_at, class_id FROM sessions ORDER BY created_at DESC LIMIT 50
  `);
  console.table(res.rows);
  await client.end();
}
main().catch(console.error);
