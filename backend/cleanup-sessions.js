const { Client } = require('pg');
async function main() {
  const client = new Client({ user: 'homura_user', host: 'localhost', database: 'attendance_db', password: 'homura123', port: 5432 });
  await client.connect();
  
  // Xóa tất cả điểm danh của các phiên thuộc ngày 22 và 23
  // Dựa vào session_id (timestamp)
  const res = await client.query(`
    DELETE FROM attendances 
    WHERE session_id IN (
      SELECT id FROM sessions 
      WHERE session_id LIKE '17768%' OR session_id LIKE '17769%'
    )
  `);
  console.log('Deleted attendances:', res.rowCount);

  const res2 = await client.query(`
    DELETE FROM sessions 
    WHERE session_id LIKE '17768%' OR session_id LIKE '17769%'
  `);
  console.log('Deleted sessions:', res2.rowCount);

  await client.end();
}
main().catch(console.error);
