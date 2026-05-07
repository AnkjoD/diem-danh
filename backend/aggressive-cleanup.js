const { Client } = require('pg');
async function main() {
  const client = new Client({ user: 'homura_user', host: 'localhost', database: 'attendance_db', password: 'homura123', port: 5432 });
  await client.connect();
  
  // Xóa sạch mọi thứ từ ngày 22/04 VN (tức là sau 17:00 UTC ngày 21/04)
  const cutOff = '2026-04-21T17:00:00Z';

  const res = await client.query(`
    DELETE FROM attendances 
    WHERE session_id IN (
      SELECT id FROM sessions 
      WHERE created_at >= $1
    )
  `, [cutOff]);
  console.log('Deleted attendances:', res.rowCount);

  const res2 = await client.query(`
    DELETE FROM sessions 
    WHERE created_at >= $1
  `, [cutOff]);
  console.log('Deleted sessions:', res2.rowCount);

  await client.end();
}
main().catch(console.error);
